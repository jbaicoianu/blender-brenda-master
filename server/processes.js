module.exports = function(spawn, io) {
var mkdirp = require('mkdirp');
var fs = require('fs');
var glob = require('glob');

var Processes = function() {
  this.children = [];
};

Processes.prototype.getBlenderFiles = function(project, callback) {
  var path = global.config.projects_dir + '/' + project.dir + '/data/**/*.blend';
  glob(path, function(err, files) {
    if (err) { console.log(err) }
    callback(files);
  });
};

Processes.prototype.getRegionConfigs = function(callback) {
  var path = global.dirname + '/config/regions/**/*.conf';
  glob(path, function(err, files) {
    if (err) { console.log(err) }
    callback(files);
  });
};

Processes.prototype.buildConfig = function(opts, callback) {
  var configLines = [
    'WORK_QUEUE=sqs://elation-render-output',
    'BLENDER_PROJECT=s3://elation-render-data/'+ opts.project.dir + '.tar.gz',
    'RENDER_OUTPUT=s3://elation-render-output/'+ opts.project.dir + '/' + opts.jobname + '/',
    'BLENDER_FILE=' + opts.renderOpts.blenderFile,
    'BLENDER_RENDER_RESOLUTION_X=' + opts.renderOpts.renderResolutionX,
    'BLENDER_RENDER_RESOLUTION_Y=' + opts.renderOpts.renderResolutionY,
    'BLENDER_RENDER_RESOLUTION_PERCENTAGE=' + opts.renderOpts.renderPercentage,
    'BLENDER_CYCLES_SAMPLES=' + opts.renderOpts.samples,
    'BLENDER_CYCLES_DEVICE=' + opts.renderOpts.device
    ].join('\n');
  var path = global.config.projects_dir + '/' + opts.project.dir + '/jobs/' + opts.jobname + '/scratch/brenda-job.conf';
  fs.writeFile(path, configLines, function(err) {
    if (err) { console.log(err) } 
    callback();
  });
};

Processes.prototype.submitJob = function(client, jobargs) {
  var args = [];
  this.makeJobDir(jobargs.project.dir, jobargs.jobname, function() {
    this.buildConfig(jobargs, function() {
      if (jobargs.jobtype == 'animation') {
        args = [jobargs.project.dir, jobargs.jobname, 'animation', '-s', jobargs.start, '-e', jobargs.numframes];
      }
      else if (jobargs.jobtype == 'subframe') {
        args = [jobargs.project.dir, jobargs.jobname, 'subframe', '-s', jobargs.start, '-e', jobargs.numframes, '-X', jobargs.tilesX, '-Y', jobargs.tilesY];
      }
      else if (jobargs.jobtype == 'bake') {
        args = [jobargs.project.dir, jobargs.jobname, 'bake', '-e', jobargs.numobjects];
      }
      var child = spawn(global.config.spawn_jobs, args); // change to brenda-work
      this.children.push(child);
      child.stdout.on('data', function(data) {
        // emit stdout to the client who started this request
        console.log('stdout: ' + data);
        client.emit('stdout', data.toString());
      });
    }.bind(this));
  }.bind(this));
};

Processes.prototype.spawnInstance = function(client, instargs) {
  var args = ['-c', regionConf, '-N', instargs.instancecount.num, '-i', instargs.instancetype, '-p', instargs.instanceprice];
  if (instargs.availabilityzone && instargs.availabilityzone.length > 0) {
    args = args.concat(['-z', instargs.availabilityzone]);
  }
  if (instargs.region && instargs.region.length > 0) {
    var regionConf = global.dirname + '/config/regions/' + instargs.region;
    args = args.concat(['-c', regionConf]);
  }
  args.push('spot');

  var child = spawn(global.config.brenda_run, args);
  this.children.push(child);
  child.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
    client.emit('stdout', data.toString());
  });
};

Processes.prototype.buildJobFile = function(client, jobname) {
  var args = [global.config.jobdata_dir + jobname];
  console.log(args);
  var child = spawn(global.config.build_jobfile, args);
  this.children.push(child);
  child.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
    io.sockets.connected[client].emit('stdout', data.toString());
  });
};

Processes.prototype.checkInstancePrice = function(client, instargs) {
  var args = ['-i', instargs.instancetype];
  if (instargs.region && instargs.region.length > 0) {
    var regionConf = global.dirname + '/config/regions/' + instargs.region;
    args = args.concat(['-c', regionConf]);
  }  
  args.push('price');
  var child = spawn('brenda-run', args);
  this.children.push(child);
  
  child.stdout.on('data', function(data) {
    console.log(data.toString());
    var lines = data.toString().split('\n');
    if (lines.length > 2) {
      var prices = {};
      for (var i=1; i < lines.length; i++) {
        var parts = lines[i].split(" ");
        if (parts.length > 0) {
          prices[parts[0]] = parts[2];
        }
      }
      client.emit('priceupdate', prices);
    }
    else {
      client.emit('priceupdate', 'No price info');
    }
  });
};

Processes.prototype.makeJobDir = function(projectDir, jobname, callback) {
  mkdirp(global.config.projects_dir + '/' + projectDir + '/jobs/' + jobname + '/' + 'scratch', function(err) {
    if (err) { console.log(err) }
    callback();
  });
};

Processes.prototype.killAll = function() {
  console.log('killing', this.children.length, 'child processes');
  this.children.forEach(function(child) {
    child.kill();
  });
};

return new Processes();
};


