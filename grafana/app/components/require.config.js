/**
 * Bootstrap require with the needed config, then load the app.js module.
 */
require.config({
  baseUrl: 'app',

  paths: {
    config:                   ['../config', '../config.sample'],
    settings:                 'components/settings',
    kbn:                      'components/kbn',
    store:                    'components/store',

    css:                      '../vendor/require/css',
    text:                     '../vendor/require/text',
    moment:                   '../vendor/moment',
    filesaver:                '../vendor/filesaver',
    angular:                  '../vendor/angular/angular',
    'angular-route':          '../vendor/angular/angular-route',
    'angular-dragdrop':       '../vendor/angular/angular-dragdrop',
    'angular-strap':          '../vendor/angular/angular-strap',
    'angular-file-upload':    '../vendor/angular/angular-file-upload',
    timepicker:               '../vendor/angular/timepicker',
    datepicker:               '../vendor/angular/datepicker',
    bindonce:                 '../vendor/angular/bindonce',
    crypto:                   '../vendor/crypto.min',
    spectrum:                 '../vendor/spectrum',
    lodash:                   'components/lodash.extended',
    'lodash-src':             '../vendor/lodash',
    bootstrap:                '../vendor/bootstrap/bootstrap',
    'socketio':                 'components/socketio',
    jquery:                   '../vendor/jquery/jquery-2.1.1.min',
    'jquery-ui':              '../vendor/jquery/jquery-ui-1.10.3',
    
    'extend-jquery':          'components/extend-jquery',

    'jquery.flot':            '../vendor/jquery/jquery.flot',
    'jquery.flot.pie':        '../vendor/jquery/jquery.flot.pie',
    'jquery.flot.events':     '../vendor/jquery/jquery.flot.events',
    'jquery.flot.selection':  '../vendor/jquery/jquery.flot.selection',
    'jquery.flot.stack':      '../vendor/jquery/jquery.flot.stack',
    'jquery.flot.stackpercent':'../vendor/jquery/jquery.flot.stackpercent',
    'jquery.flot.time':       '../vendor/jquery/jquery.flot.time',
    'jquery.flot.crosshair':  '../vendor/jquery/jquery.flot.crosshair',

    modernizr:                '../vendor/modernizr-2.6.1',

    'bootstrap-tagsinput':    '../vendor/tagsinput/bootstrap-tagsinput',

  },
  shim: {

    spectrum: {
      deps: ['jquery']
    },

    crypto: {
      exports: 'Crypto'
    },

    angular: {
      deps: ['jquery','config'],
      exports: 'angular'
    },

    bootstrap: {
      deps: ['jquery']
    },

    modernizr: {
      exports: 'Modernizr'
    },

    jquery: {
      exports: 'jQuery'
    },
    
    socketio: {
      exports: 'io'
    },
    

    // simple dependency declaration
    //
    'jquery-ui':            ['jquery'],
    'jquery.flot':          ['jquery'],
    'jquery.flot.pie':      ['jquery', 'jquery.flot'],
    'jquery.flot.events':   ['jquery', 'jquery.flot'],
    'jquery.flot.selection':['jquery', 'jquery.flot'],
    'jquery.flot.stack':    ['jquery', 'jquery.flot'],
    'jquery.flot.stackpercent':['jquery', 'jquery.flot'],
    'jquery.flot.time':     ['jquery', 'jquery.flot'],
    'jquery.flot.crosshair':['jquery', 'jquery.flot'],
    'angular-cookies':      ['angular'],
    'angular-dragdrop':     ['jquery','jquery-ui','angular'],
    'angular-loader':       ['angular'],
    'angular-mocks':        ['angular'],
    'angular-resource':     ['angular'],
    'angular-route':        ['angular'],
    'angular-touch':        ['angular'],
    'angular-file-upload':  ['angular'],
    'bindonce':             ['angular'],
    'angular-strap':        ['angular', 'bootstrap','timepicker', 'datepicker'],
    'angularFileUpload':    ['angular'],
    timepicker:             ['jquery', 'bootstrap'],
    datepicker:             ['jquery', 'bootstrap'],

    'bootstrap-tagsinput':          ['jquery'],
  },
  waitSeconds: 60,
});
