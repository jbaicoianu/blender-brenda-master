define([
        'angular',
        'app',
        'lodash',
    ],
    function(angular, app, _) {
        'use strict';

        var module = angular.module('grafana.panels.render', ['angularFileUpload']);

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


        module.controller('render', function($scope, $http, $upload, socket, panelSrv) {
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
            // $scope.inst_count = new InstanceCount();
            // $scope.inst_price = new InstancePrice();
            $scope.instanceArgs = {
                instancecount: new InstanceCount(1),
                instancetype: $scope.instancetypes[0],
                instanceprice: 0.001
            };

            $scope.percent = 0;
            $scope.onFileSelect = function($files) {

                //$files: an array of files selected, each file has name, size, and type.
                for (var i = 0; i < $files.length; i++) {
                    var $file = $files[i];
                    $upload.upload({
                            url: '/api/upload' + $scope.client_id,
                            file: $file,
                        })
                        .progress(function(evt) {
                            $scope.percent = 'percent: ' + parseInt(100.0 * evt.loaded / evt.total, 10);
                        })
                        .success(function(data, status, headers, config) {
                            // file is uploaded successfully
                            $scope.percent = 'status code: ' + status;
                        });
                }
            };


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
