module.exports = function(config) {
  'use strict';

  config.set({
    basePath: '../../',

    frameworks: ['mocha', 'requirejs', 'expect', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      'src/test/test-main.js',
      {pattern: 'src/app/**/*.js', included: false},
      {pattern: 'src/vendor/**/*.js', included: false},
      {pattern: 'src/test/**/*.js', included: false},
      {pattern: 'src/**/*.js', included: false}
    ],

    // list of files to exclude
    exclude: [],

    reporters: ['dots'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    captureTimeout: 60000,
    singleRun: true,

  });
};
