module.exports = function(spawn, io) {
var mkdirp = require('mkdirp');
var fs = require('fs');
var glob = require('glob');

var Processes = function() {
  this.children = [];
  this.instances = {};
  this.db = false;
};

Processes.prototype.setDatabase = function(db) {
  this.db = db;
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
    ];
  if (opts.jobtype == "bake") {
    var baketype = opts.baketype || 'COMBINED',
        bakemargin = opts.bakemargin || 0,
        bakeuvlayer = opts.bakeuvlayer || 'LightMap';
    configLines.push('BLENDER_BAKE_TYPE=' + baketype);
    configLines.push('BLENDER_BAKE_MARGIN=' + bakemargin);
    configLines.push('BLENDER_BAKE_UVLAYER=' + bakeuvlayer);
  }

  var configText = configLines.join('\n') + '\n';
  var path = global.config.projects_dir + '/' + opts.project.dir + '/jobs/' + opts.jobname + '/scratch/brenda-job.conf';
  fs.writeFile(path, configText, function(err) {
    if (err) { console.log(err) } 
    callback();
  });
};

Processes.prototype.submitJob = function(client, jobargs) {
  var args = [];
  this.makeJobDir(jobargs.project.dir, jobargs.jobname, function() {
    this.buildConfig(jobargs, function() {
      if (jobargs.jobtype == 'animation') {
        if (jobargs.subframe) {
          args = [jobargs.project.dir, jobargs.jobname, 'subframe', '-s', jobargs.start, '-e', jobargs.end, '-X', jobargs.tilesX, '-Y', jobargs.tilesY];
        } else {
          args = [jobargs.project.dir, jobargs.jobname, 'animation', '-s', jobargs.start, '-e', jobargs.end];
        }
      } else if (jobargs.jobtype == 'bake') {
        args = [jobargs.project.dir, jobargs.jobname, 'bake', '-s', 0, '-e', jobargs.numobjects];
      }
      var child = spawn(global.config.spawn_jobs, args); // change to brenda-work
      this.children.push(child);
      child.stdout.on('data', function(data) {
        // emit stdout to the client who started this request
        console.log('stdout: ' + data);
        client.emit('stdout', data.toString());
      });
      child.on('exit', function(code) {
        this.checkJobCount();
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

Processes.prototype.spawnInstance = function(client, instargs) {
  var args = ['-N', instargs.instancecount.num, '-i', instargs.instancetype, '-p', instargs.instanceprice];
  if (instargs.availabilityzone && instargs.availabilityzone.length > 0) {
    args = args.concat(['-z', instargs.availabilityzone]);
  }
  if (instargs.region && instargs.region.length > 0) {
    var regionConf = global.dirname + '/config/regions/' + instargs.region;
    args = args.concat(['-c', regionConf]);
  }
  if (instargs.dryrun) {
    args = args.concat(['-d']);
  }
  args.push('spot');

  var child = spawn(global.config.brenda_run, args);
  this.children.push(child);
  child.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
    client.emit('stdout', data.toString());
  });
  child.stderr.on('data', function(data) {
    console.log('stderr: ' + data);
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
Processes.prototype.checkInstanceCounts = function() {
  if (!this.db) return;

  this.getRegionConfigs(function(files) {
    var regions = [];
    for (var i = 0; i < files.length; i++) {
      var parts = files[i].split('/');
      var regionconf = parts[parts.length - 1];
      this.checkInstanceCountForRegion(regionconf.substr(0, regionconf.indexOf('.')));
    }
    // Write the current instance counts into influxdb every 10 seconds
    setInterval(function() { this.db.writePoint('instances', this.instances); }.bind(this), 10000);
  }.bind(this));
};
Processes.prototype.checkInstanceCountForRegion = function(region) {
  if (!this.db) return;
  var args = []; //'-i', instargs.instancetype];
  if (region && region.length > 0) {
    var regionConf = global.dirname + '/config/regions/' + region + '.conf';
    args = args.concat(['-c', regionConf]);
  }
  args.push('instances');
  //console.log('Check instance count for region ' + region, args);
  var child = spawn('brenda-tool', args);
  this.children.push(child);

  var instancecount = 0;
  //this.instances[region] = 0;
  child.stdout.on('data', function(data) {
    var lines = data.toString().trim().split('\n');
    instancecount = lines.length;
  }.bind(this));
  child.on('exit', function(code) {
    this.instances[region] = instancecount;
    var influxcfg = global.config.influxdb;
    var refreshtime = (influxcfg && influxcfg.refresh && influxcfg.refresh.instances ? influxcfg.refresh.instances : 30000);
    setTimeout(this.checkInstanceCountForRegion.bind(this, region), refreshtime);
  }.bind(this));
};
Processes.prototype.checkJobCount = function() {
  if (!this.db) return;
  var args = ['status'];
  //console.log('Check job count');
  var child = spawn('brenda-work', args);
  this.children.push(child);

  var jobcount = 0;
  //this.instances[region] = 0;
  child.stdout.on('data', function(data) {
    var lines = data.toString().trim().split(': ');
    jobcount = lines[1];
  }.bind(this));
  child.on('exit', function(code) {
    this.db.writePoint('jobs', {'jobs': jobcount});
    var influxcfg = global.config.influxdb;
    var refreshtime = (influxcfg && influxcfg.refresh && influxcfg.refresh.jobs ? influxcfg.refresh.jobs : 30000);
    setTimeout(this.checkJobCount.bind(this), refreshtime);
  }.bind(this));
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


