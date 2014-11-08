module.exports = function(spawn, io) {
var mkdirp = require('mkdirp');

var Processes = function() {
  this.children = [];
};
Processes.prototype.submitJob = function(client, jobargs) {
  var args = [];
  this.makeJobDir(jobargs.project.dir, jobargs.jobname, function() {
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
};

Processes.prototype.spawnInstance = function(client, instargs) {
  var args = ['-N', instargs.instancecount.num, '-i', instargs.instancetype, '-p', instargs.instanceprice];
  if (instargs.availabilityzone && instargs.availabilityzone.length > 0) {
    args = args.concat(['-z', instargs.availabilityzone]);
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

Processes.prototype.checkInstancePrice = function(client, instancetype) {
  var args = ['-i', instancetype, 'price'];
  console.log(args);
  var child = spawn('brenda-run', args);
  this.children.push(child);
  child.stdout.on('data', function(data) {
    console.log(data.toString());
    var lines = data.toString().split('\n');
    if (lines.length > 2) {
      //var instType = lines[0].split(" ")[5];
      var prices = {};
      for (var i=1; i < 4; i++) {
        var parts = lines[i].split(" ");
        prices[parts[0]] = parts[2];
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
    if (err) { console.log(err) };
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


