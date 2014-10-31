module.exports = function(spawn, io) {

var Processes = function() {
  this.children = [];
};
Processes.prototype.submitJob = function(client, jobargs) {
  var args = [];
  if (jobargs.jobtype == 'animation') {
    args = ['-T', global.config.template_dir + 'animation', '-e', jobargs.numframes, '-d', 'push'];
  }
  else if (jobargs.jobtype == 'subframe') {
    args = ['-T', global.config.template_dir + 'subframe', '-e', jobargs.numframes, '-X', jobargs.tilesX, '-Y', jobargs.tilesY, '-d', 'push'];
  }
  else if (jobargs.jobtype == 'bake') {
    args = ['-T', global.config.template_dir + 'bake', '-e', jobargs.numobjects, '-d', 'push'];
  }
  var child = spawn(global.config.brenda_work, args); // change to brenda-work
  this.children.push(child);
  child.stdout.on('data', function(data) {
    // emit stdout to the client who started this request
    console.log('stdout: ' + data);
    client.emit('stdout', data.toString());
  });
};

Processes.prototype.spawnInstance = function(client, instargs) {
  var args = ['-N', instargs.instancecount.num, '-i', instargs.instancetype, '-p', instargs.instanceprice, 'spot'];
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
  child.stdout.on('data', function(data) {
    console.log(data.toString());
    var lines = data.toString().split('\n');
    var instType = lines[0].split(" ")[5];
    var prices = []
    for (var i=1; i < 4; i++) {
      prices.push(lines[i].split(" ")[2]);
    }
    client.emit('priceupdate', prices);
  });
};

return new Processes();
};


