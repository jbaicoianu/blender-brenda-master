// server.js
// config
var config = require('./serverconfig');
// requires
var express = require('express');
var morgan = require('morgan');
var passport = require('passport');
var basicStrategy = require('passport-http').BasicStrategy;
var spawn = require('child_process').spawn;
var busboy = require('connect-busboy');
var fs = require('fs');

var app = express();                          

var server = app.listen(config.port);
// TODO - add proper socket auth in 0.2
var io = require('socket.io').listen(server);

// set up logging and json parsing
app.use(morgan('dev'));         // log every request to the console
app.use(busboy());

// set up authentication

app.use(passport.initialize());

// users are in config 
// TODO v0.2 - get user from redis, use token based auth instead of cookies
var users = config.users;

var findByUsername = function(username, fn){
      for (var i = 0, len = users.length; i < len; i++) {
        var user = users[i];
            if (user.username === username) {
              return fn(null, user);
            }
      }
      return fn(null, null);
};

passport.use(new basicStrategy({
  },
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
       
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure.  Otherwise, return the authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (user.password != password) { return done(null, false); }
        return done(null, user);
      });
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
app.use(express.cookieParser());
app.use(express.session({secret: config.session_secret})); // FIXME - move to config for now
                                              // v0.2 shouldn't need this
app.use(passport.session());
app.use(passport.authenticate('basic'));
app.use(express.static(__dirname + '/grafana/dist'));   // set the static files location

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
    io.sockets.connected[client_id].emit('stdout', data.toString());
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
