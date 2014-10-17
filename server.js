// server.js
// config
var config = require('./serverconfig');
// requires
var express         = require('express'),
    morgan          = require('morgan'),
    passport        = require('passport'),
    basicStrategy   = require('passport-http').BasicStrategy,
    spawn           = require('child_process').spawn,
    busboy          = require('connect-busboy'),
    fs              = require('fs'),
    express_session = require('express-session'),
    cookieParser    = require('cookie-parser'),
    app             = express(),                       
    server          = app.listen(config.port),
    io              = require('socket.io').listen(server),
    users           = config.users;

// file handler
app.use(busboy());

// set up authentication and then static files
require('./server/auth')(app, config, passport, basicStrategy, cookieParser, express_session);
app.use(express.static(__dirname + '/grafana/dist')); 

// make sure children die
var children = []; // array to store references to child processes so we can make sure they die
process.on('exit', function() {
  console.log('killing', children.length, 'child processes');
  children.forEach(function(child) {
    child.kill();
  });
});


var client_id = false;
// socket listeners
io.on('connection', function(client) { 
  client_id = client.id;
  //socket(client.id).emit('stdout', 'test');
  client.emit('connected', client.id);        
    console.log('client connected');
  client.on('submitjob', function(data) {
    console.log('job submit, data: ', data);
    submitJob(client, data);
  });
  client.on('spawninstance', function(data) {
    console.log('instance submit, data: ', data);
    spawnInstance(client, data);
  });
});

// child process spawners
var submitJob = function(client, jobargs) {
    var args = [];
    if (jobargs.jobtype == 'animation') {
      args = ['-T', config.template_dir + 'animation', '-e', jobargs.numframes, '-d', 'push'];
    }
    else if (jobargs.jobtype == 'subframe') {
      args = ['-T', config.template_dir + 'subframe', '-e', jobargs.numframes, '-X', jobargs.tilesX, '-Y', jobargs.tilesY, '-d', 'push'];
    }
    else if (jobargs.jobtype == 'bake') {
      args = ['-T', config.template_dir + 'bake', '-e', jobargs.numobjects, '-d', 'push'];
    }
    var child = spawn(config.brenda_work, args); // change to brenda-work
    children.push(child);
    child.stdout.on('data', function(data) {
      // emit stdout to the client who started this request
      console.log('stdout: ' + data);
      client.emit('stdout', data.toString());
    });
};

var spawnInstance = function(client, instargs) {
  var args = ['-N', instargs.instancecount.num, '-i', instargs.instancetype, '-p', instargs.instanceprice, 'spot'];
  var child = spawn(config.brenda_run, args);
  children.push(child);
  child.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
    client.emit('stdout', data.toString());
  });
};

var buildJobFile = function(client, jobname) {
  var args = [config.jobdata_dir + jobname];
  console.log(args);
  var child = spawn(config.build_jobfile, args);
  children.push(child);
  child.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
    io.sockets.connected[client].emit('stdout', data.toString());
  });
};


// api routes

app.post('/api/upload:client_id', function(req, res) {
    var client_id = req.params.client_id;
    //console.log(req.busboy);
    req.pipe(req.busboy);
    req.busboy.on('file', function(fieldname, file, filename) {
      console.log(config.jobdata_dir + filename);
      var fstream = fs.createWriteStream(config.jobdata_dir + filename); 
      file.pipe(fstream);
      fstream.on('close', function () {
          // file upload completed (hopefully)
          buildJobFile(client_id, filename);
          res.redirect('back');
      });
    });
    
});


console.log("server listening on", config.port);
