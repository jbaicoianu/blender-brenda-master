/*jshint ignore:start*/
require.config({
  paths: {
    socketio: '/socket.io/socket.io'
  },
  shim: {
    'socketio': {
      exports: 'io'
    }
  }
});
define([
  'angular',
  'app',
  'lodash',
  'socketio'
], function(angular, app, _, io) {
  angular.module('grafana.factories', []).
  provider('socketFactory', function() {
    'use strict';
    // when forwarding events, prefix the event name
    var defaultPrefix = 'socket:',
      ioSocket;
    // expose to provider
    this.$get = ['$rootScope', '$timeout',
      function($rootScope, $timeout) {
        var asyncAngularify = function(socket, callback) {
          return callback ? function() {
            var args = arguments;
            $timeout(function() {
              callback.apply(socket, args);
            }, 0);
          } : angular.noop;
        };
        return function socketFactory(options) {
          options = options || {};
          var socket = options.ioSocket || io.connect();
          var prefix = options.prefix || defaultPrefix;
          var defaultScope = options.scope || $rootScope;
          var addListener = function(eventName, callback) {
            socket.on(eventName, callback.__ng = asyncAngularify(socket, callback));
          };
          var addOnceListener = function(eventName, callback) {
            socket.once(eventName, callback.__ng = asyncAngularify(socket, callback));
          };
          var wrappedSocket = {
            on: addListener,
            addListener: addListener,
            once: addOnceListener,
            emit: function(eventName, data, callback) {
              var lastIndex = arguments.length - 1;
              var callback = arguments[lastIndex];
              if (typeof callback === 'function') {
                callback = asyncAngularify(socket, callback);
                arguments[lastIndex] = callback;
              }
              return socket.emit.apply(socket, arguments);
            },
            removeListener: function(ev, fn) {
              if (fn && fn.__ng) {
                arguments[1] = fn.__ng;
              }
              return socket.removeListener.apply(socket, arguments);
            },
            removeAllListeners: function() {
              return socket.removeAllListeners.apply(socket, arguments);
            },
            disconnect: function(close) {
              return socket.disconnect(close);
            },
            // when socket.on('someEvent', fn (data) { ... }),
            // call scope.$broadcast('someEvent', data)
            forward: function(events, scope) {
              if (events instanceof Array === false) {
                events = [events];
              }
              if (!scope) {
                scope = defaultScope;
              }
              events.forEach(function(eventName) {
                var prefixedEvent = prefix + eventName;
                var forwardBroadcast = asyncAngularify(socket, function(data) {
                  scope.$broadcast(prefixedEvent, data);
                });
                scope.$on('$destroy', function() {
                  socket.removeListener(eventName, forwardBroadcast);
                });
                socket.on(eventName, forwardBroadcast);
              });
            }
          };
          return wrappedSocket;
        };
      }
    ];
  });
  var module = angular.module('grafana.panels.render', ['$strap.directives']);
  app.useModule(module);
  // factory to create socket
  module.factory('socket', function($rootScope) {
    var socket = io.connect();
    return {
      on: function(eventName, callback) {
        socket.on(eventName, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            callback.apply(socket, args);
          });
        });
      },
      emit: function(eventName, data, callback) {
        socket.emit(eventName, data, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        });
      }
    };
  });
  module.controller('render', function($scope, $http, $modal, socket, panelSrv) {
    // panel setup
    $scope.panelMeta = {
      description: 'description lorem ipsum'
    };
    var _d = {
      title: 'Render Options',
    };
    _.defaults($scope.panel, _d);
    // socket setup
    $scope.client_id = false;
    $scope.connected = false;
    $scope.stdout = [];
    $scope.exitstate = [];
    $scope.selectedProject = '';
    $scope.jobname = '';
    $scope.regions = [];
    socket.on('connected', function(data) {
      $scope.$evalAsync(function() {
        $scope.client_id = data;
        $scope.connected = true;
      });
    });
    socket.on('disconnect', function(data) {
      $scope.$evalAsync(function() {
        $scope.client_id = false;
        $scope.connected = false;
      });
    });
    socket.on('stdout', function(data) {
      $scope.stdout = $scope.stdout.concat(data);
      $scope.scrollDebugToBottom();
    });
    socket.on('exit', function(data) {
      $scope.exitstate = $scope.exitstate.concat(data);
    });
    socket.on('priceupdate', function(data) {
      $scope.current_price = 'Current prices: '+ JSON.stringify(data);
      $scope.checking_price = false;
      $scope.instancePrices[$scope.instanceArgs.instancetype] = data;
    });
    socket.on('projectupdate', function(data) {
      $scope.projects = data;
    });
    socket.on('projectadded', function(data) {
      $scope.selectedProject = data;
    });
    socket.on('blenderFileUpdate', function(data) {
      $scope.blenderFiles = []
      for (var i = 0; i < data.length; i++) {
        var parts = data[i].split('/data/');
        $scope.blenderFiles.push(parts[1]);
      }
      $scope.renderOpts.blenderFile = $scope.blenderFiles[0];
      $scope.checking_files = false;
    })
    socket.on('regionconfigs', function(data) {
      $scope.regions = data;
      $scope.instanceArgs.region = $scope.regions[0];
    });
    // job queue args
    $scope.jobtypes = [{
      value: 'frames',
      text: 'Frames'
    }, {
      value: 'bake',
      text: 'Bake'
    }];
    $scope.jobtype = $scope.jobtypes[0];
    $scope.animationArgs = {
      jobtype: 'animation',
      start: 1,
      end: 1,
      frameskip: 1,
      subframe: false,
      tilesX: 1,
      tilesY: 1
    };
    $scope.bakeArgs = {
      jobtype: 'bake',
      numobjects: 1
    };
    // instance args
    $scope.instancetypes = [
      't1.micro',
      'm3.medium',
      'm3.large',
      'm3.xlarge',
      'm3.2xlarge',
      'c3.large',
      'c3.xlarge',
      'c3.2xlarge',
      'c3.4xlarge',
      'c3.8xlarge',
      'r3.large',
      'r3.xlarge',
      'r3.2xlarge',
      'r3.4xlarge',
      'r3.8xlarge',
      'g2.2xlarge',
    ];
    $scope.renderOpts = {
      blenderFile: '',
      renderResolutionX: 1280,
      renderResolutionY: 720,
      renderPercentage: 100,
      samples: 1500,
      device: 'GPU'
    }
    $scope.devices = ['CPU', 'GPU']
    $scope.newProject = false;
    var InstanceCount = function(value) {
      var num = value;
      this.__defineGetter__("num", function() {
        return num;
      });
      this.__defineSetter__("num", function(val) {
        val = parseInt(val, 10);
        num = val;
      });
    };
    $scope.instanceArgs = {
      instancecount: new InstanceCount(1),
      instancetype: $scope.instancetypes[0],
      region: $scope.regions[0],
      availabilityzone: 'us-west-2c',
      instanceprice: 0.001
    };
    $scope.percent = 0;
    $scope.instancePrices = {};
    $scope.uploadFile = function(files) {
      var uploadUrl = '/api/upload' + $scope.client_id;
      var fd = new FormData;
      var xhr = new XMLHttpRequest;
      
      fd.append("file", files[0]);
      
      xhr.upload.onprogress = function(ev) {
        $scope.$apply(function() {
          $scope.percent = 'percent: ' + parseInt(100.0 * ev.loaded / ev.total, 10);
        })
      };
      xhr.upload.onload = function(ev) {
        $scope.percent = 'upload finished';
      };
      xhr.open('POST', uploadUrl);
      xhr.send(fd);
    };
    $scope.submitJob = function() {
      console.log($scope.jobtype, $scope.animationArgs);
      if ($scope.jobtype.value == 'frames') {
          $scope.submitAnimJob();
      } else if ($scope.jobtype.value == 'bake') {
          $scope.submitBakeJob();
      }
    };
    $scope.submitAnimJob = function() {
      if ($scope.client_id) {
        $scope.animationArgs['jobname'] = $scope.jobname;
        $scope.animationArgs['project'] = $scope.selectedProject;
        $scope.animationArgs['renderOpts'] = $scope.renderOpts;
        socket.emit('submitjob', $scope.animationArgs);
      }
    };
    $scope.submitBakeJob = function() {
      if ($scope.client_id) {
        $scope.bakeArgs['jobname'] = $scope.jobname;
        $scope.bakeArgs['project'] = $scope.selectedProject;
        $scope.bakeArgs['renderOpts'] = $scope.renderOpts;
        socket.emit('submitjob', $scope.bakeArgs);
      }
    };
    $scope.submitInstanceSpawn = function() {
      if ($scope.client_id) {
        socket.emit('spawninstance', $scope.instanceArgs);
      }
    };
    $scope.getInstancePrice = function(instancetype, reset) {
      $scope.current_price = "Checking...";
      $scope.checking_price = true;
      if (reset) {
        $scope.instancePrices[$scope.instanceArgs.instancetype] = {};
      }
      if ($scope.client_id) {
        socket.emit('checkprice', $scope.instanceArgs)
      }
    };
    $scope.getEstimatedPrices = function() {
      var instancecount = $scope.instanceArgs.instancecount.num,
          instanceprice = $scope.instanceArgs.instanceprice,
          instancetype = $scope.instanceArgs.instancetype,
          availabilityzone = $scope.instanceArgs.availabilityzone;
      var currentprice = 0, maxprice = instancecount * instanceprice;

      if ($scope.instancePrices[instancetype] && $scope.instancePrices[instancetype][availabilityzone]) {
        var iprice = $scope.instancePrices[instancetype][availabilityzone].substr(1); // strip leading $
        currentprice = iprice * instancecount;
      }
      return [currentprice.toFixed(4), maxprice.toFixed(4)];
    };
    $scope.getEstimatedCurrentPrice = function() {
      var prices = $scope.getEstimatedPrices();
      return prices[0];
    }
    $scope.getEstimatedMaxPrice = function() {
      var prices = $scope.getEstimatedPrices();
      return prices[1];
    }
    $scope.isMaxPriceHighEnough = function() {
      var prices = $scope.getEstimatedPrices();
      return (prices[0] != '0.0000' && parseFloat(prices[0]) < parseFloat(prices[1]));
    }
    $scope.addProject = function(newProject) {
      if ($scope.client_id) {
        socket.emit('addProject', newProject);
      }
    };
    $scope.getBlenderFiles = function() {
      $scope.checking_files = true;
      socket.emit('getBlenderFiles', $scope.selectedProject);
    };
    // panel init
    $scope.disableJobSubmit = function() {
      if ($scope.jobname == '' || !$scope.selectedProject || !$scope.renderOpts.blenderFile || !$scope.connected) {
        return true;  
      }
      return false;
    }
    $scope.scrollDebugToBottom = function() {
      console.log('scroll the debug window');
      setTimeout(function() {
        var debug = document.getElementById('debug');
        if (debug) {
          debug.scrollTop = debug.scrollHeight;
        }
      }, 0);
    }
    $scope.init = function() {
      panelSrv.init(this);
      // Fetch default instance type price data on init
      setTimeout(function() { $scope.getInstancePrice($scope.instanceArgs.instancetype); }, 1000);
    };
    $scope.openEditor = function() {};
    $scope.init();
  });
});
/*jshint ignore: end*/
