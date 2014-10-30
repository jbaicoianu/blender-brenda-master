
module.exports = function(fs) {

var BrendaProjects = function() {
  this.projectFile = './server/projects.json';
  this.projects = {};
  fs.readFile(this.projectFile, 'utf8', function(err, data) {
    if (err) { throw err }
    this.projects = JSON.parse(data);
  }.bind(this));
};

BrendaProjects.setData = function(err, data) {
};

BrendaProjects.prototype.addProject = function(name, url, callback) {
  if (this.projects.hasOwnProperty(name)) {
    throw new Error('Project already exists - choose a different name'); 
  }
  var projectId = Object.keys(this.projects).length; 
  var newProject = {};
  newProject[name] = {
      'url': url,
      'dir': projectId // for now
  };
  for (var key in newProject) {
    if (newProject.hasOwnProperty(key)) {
      this.projects[key] = newProject[key];
    }
  }
  this.write();
  callback();
};

BrendaProjects.prototype.write = function() {
  var pjObj = JSON.stringify(this.projects, null, 2);
  fs.writeFile(this.projectFile, pjObj, 'utf-8', function() {});
};

return new BrendaProjects();
};