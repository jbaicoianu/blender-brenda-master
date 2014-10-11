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
    ],
    function(angular, app, _, io) {
        'use strict';
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
                                if (typeof callback == 'function') {
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

        var module = angular.module('grafana.panels.render', []);
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
                    })
                }
            };
        });


        module.controller('render', function($scope, $http, socket, panelSrv) {
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
            $scope.stdout = [];
            $scope.exitstate = [];
            socket.on('connected', function(data) {
                $scope.client_id = data;
            });
            socket.on('stdout', function(data) {
                $scope.stdout = $scope.stdout.concat(data);
            });
            socket.on('exit', function(data) {
                $scope.exitstate = $scope.exitstate.concat(data);
            });

            // job queue args
            $scope.jobtypes = [{
                value: 'animation',
                text: 'Animation'
            }, {
                value: 'subframe',
                text: 'Subframe'
            }, {
                value: 'bake',
                text: 'bake'
            }];
            $scope.jobstate = $scope.jobtypes[0];

            $scope.animationArgs = {
                jobtype: 'animation',
                numframes: 1,
            };
            $scope.subframeArgs = {
                jobtype: 'subframe',
                numframes: 1,
                tilesX: 1,
                tilesY: 1
            };
            $scope.bakeArgs = {
                jobtype: 'bake',
                numobjects: 1
            };
            // instance args
            $scope.instancetypes = [
                't2.micro',
                't2.small',
                't2.medium',
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
                'i2.xlarge',
                'i2.2xlarge',
                'i2.4xlarge',
                'i2.8xlarge',
                'hs1.8xlarge',
            ];
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
                instanceprice: 0.001
            };

            $scope.percent = 0;
            $scope.uploadFile = function(files) {
                var uploadUrl = '/api/upload' + $scope.client_id;
                var fd = new FormData();
                //Take the first selected file
                fd.append("file", files[0]);
                $http.post(uploadUrl, fd, {
                    withCredentials: true,
                    headers: {'Content-Type': undefined },
                    transformRequest: angular.identity
                })
                .success(function() {
                    $scope.percent = 'success';
                })
                .error(function() {
                    $scope.percent = 'error';
                });
        
            };
            // $scope.onFileSelect = function($files) {

            //     //$files: an array of files selected, each file has name, size, and type.
            //     for (var i = 0; i < $files.length; i++) {
            //         var $file = $files[i];
            //         $upload.upload({
            //                 url: '/api/upload' + $scope.client_id,
            //                 file: $file,
            //             })
            //             .progress(function(evt) {
            //                 $scope.percent = 'percent: ' + parseInt(100.0 * evt.loaded / evt.total, 10);
            //             })
            //             .success(function(data, status, headers, config) {
            //                 // file is uploaded successfully
            //                 $scope.percent = 'status code: ' + status;
            //             });
            //     }
            // };


            $scope.submitAnimJob = function() {
                socket.emit('submitjob', $scope.animationArgs);
            };
            $scope.submitSubframeJob = function() {
                socket.emit('submitjob', $scope.subframeArgs);
            };
            $scope.submitBakeJob = function() {
                socket.emit('submitjob', $scope.bakeArgs);
            };
            $scope.submitInstanceSpawn = function() {
                socket.emit('spawninstance', $scope.instanceArgs)
            }

            // panel init
            $scope.init = function() {
                panelSrv.init(this);
            };
            $scope.openEditor = function() {};

            $scope.init();
        });
    });
