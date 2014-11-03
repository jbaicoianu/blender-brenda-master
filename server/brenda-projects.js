
module.exports = function(fs) {
var mkdirp = require('mkdirp');
var BrendaProjects = function() {
  this.projectFile = './server/projects.json';
  this.projects = {};
  fs.readFile(this.projectFile, 'utf8', function(err, data) {
    if (err) { throw err }
    this.projects = JSON.parse(data);
  }.bind(this));
};

BrendaProjects.prototype.sanitizeString = function(str) {
  str = str.replace(/[^a-z0-9 \._-]/gim,"");
  return str.trim();
};

BrendaProjects.prototype.addProject = function(name, callback) {
  if (this.projects.hasOwnProperty(name)) {
    // prevent dupes
  }
  var projectId = Object.keys(this.projects).length; 
  var newProject = {};
  newProject[name] = {
      'name': name,
      'dir': this.sanitizeString(name) // for now
  };
  for (var key in newProject) {
    if (newProject.hasOwnProperty(key)) {
      this.projects[key] = newProject[key];
    }
  }
  this.write(function() {
    var pjpath = global.config.projects_dir + '/' + newProject[name].dir;
    mkdirp(pjpath + '/data', function(err) {
      if (err) { console.log('error making dir', err); }
      mkdirp(pjpath + '/jobs', function(err2) {
        if (err2) { console.log('error making dir', err2) }
          callback(newProject[name]);
      });
    });
  });
};

BrendaProjects.prototype.write = function(callback) {
  var projectsJson = JSON.stringify(this.projects, null, 2);
  fs.writeFile(this.projectFile, projectsJson, 'utf-8', callback());
};

return new BrendaProjects();
};