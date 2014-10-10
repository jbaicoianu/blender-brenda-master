define([
  './helpers',
  'angular',
  'jquery',
  'components/timeSeries',
  'directives/grafanaGraph'
], function(helpers, angular, $, TimeSeries) {
  'use strict';

  describe('grafanaGraph', function() {

    beforeEach(module('grafana.directives'));

    function graphScenario(desc, func)  {
      describe(desc, function() {
        var ctx = {};

        ctx.setup = function (setupFunc) {

          beforeEach(module(function($provide) {
            $provide.value("timeSrv", new helpers.TimeSrvStub());
          }));

          beforeEach(inject(function($rootScope, $compile) {
            var scope = $rootScope.$new();
            var element = angular.element("<div style='width:500px' grafana-graph><div>");

            scope.height = '200px';
            scope.panel = {
              legend: {},
              grid: {},
              y_formats: [],
              seriesOverrides: [],
              tooltip: {
                shared: true
              }
            };

            scope.appEvent = sinon.spy();
            scope.onAppEvent = sinon.spy();
            scope.hiddenSeries = {};
            scope.dashboard = { timezone: 'browser' };
            scope.range = {
              from: new Date('2014-08-09 10:00:00'),
              to: new Date('2014-09-09 13:00:00')
            };
            ctx.data = [];
            ctx.data.push(new TimeSeries({
              datapoints: [[1,1],[2,2]],
              info: { alias: 'series1', enable: true }
            }));
            ctx.data.push(new TimeSeries({
              datapoints: [[1,1],[2,2]],
              info: { alias: 'series2', enable: true }
            }));

            setupFunc(scope, ctx.data);

            $compile(element)(scope);
            scope.$digest();
            $.plot = ctx.plotSpy = sinon.spy();

            scope.$emit('render', ctx.data);
            ctx.plotData = ctx.plotSpy.getCall(0).args[1];
            ctx.plotOptions = ctx.plotSpy.getCall(0).args[2];
          }));
        };

        func(ctx);
      });
    }

    graphScenario('simple lines options', function(ctx) {
      ctx.setup(function(scope) {
        scope.panel.lines = true;
        scope.panel.fill = 5;
        scope.panel.linewidth = 3;
        scope.panel.steppedLine = true;
      });

      it('should configure plot with correct options', function() {
        expect(ctx.plotOptions.series.lines.show).to.be(true);
        expect(ctx.plotOptions.series.lines.fill).to.be(0.5);
        expect(ctx.plotOptions.series.lines.lineWidth).to.be(3);
        expect(ctx.plotOptions.series.lines.steps).to.be(true);
      });
    });

    graphScenario('grid thresholds 100, 200', function(ctx) {
      ctx.setup(function(scope) {
        scope.panel.grid = {
          threshold1: 100,
          threshold1Color: "#111",
          threshold2: 200,
          threshold2Color: "#222",
        };
      });

      it('should add grid markings', function() {
        var markings = ctx.plotOptions.grid.markings;
        expect(markings[0].yaxis.from).to.be(100);
        expect(markings[0].yaxis.to).to.be(200);
        expect(markings[0].color).to.be('#111');
        expect(markings[1].yaxis.from).to.be(200);
        expect(markings[1].yaxis.to).to.be(Infinity);
      });
    });

    graphScenario('inverted grid thresholds 200, 100', function(ctx) {
      ctx.setup(function(scope) {
        scope.panel.grid = {
          threshold1: 200,
          threshold1Color: "#111",
          threshold2: 100,
          threshold2Color: "#222",
        };
      });

      it('should add grid markings', function() {
        var markings = ctx.plotOptions.grid.markings;
        expect(markings[0].yaxis.from).to.be(200);
        expect(markings[0].yaxis.to).to.be(100);
        expect(markings[0].color).to.be('#111');
        expect(markings[1].yaxis.from).to.be(100);
        expect(markings[1].yaxis.to).to.be(-Infinity);
      });
    });

    graphScenario('series option overrides, fill & points', function(ctx) {
      ctx.setup(function(scope, data) {
        scope.panel.lines = true;
        scope.panel.fill = 5;
        scope.panel.seriesOverrides = [
          { alias: 'test', fill: 0, points: true }
        ];

        data[1].info.alias = 'test';
      });

      it('should match second series and fill zero, and enable points', function() {
        expect(ctx.plotOptions.series.lines.fill).to.be(0.5);
        expect(ctx.plotData[1].lines.fill).to.be(0.001);
        expect(ctx.plotData[1].points.show).to.be(true);
      });
    });

    graphScenario('should order series order according to zindex', function(ctx) {
      ctx.setup(function(scope) {
        scope.panel.seriesOverrides = [{ alias: 'series1', zindex: 2 }];
      });

      it('should move zindex 2 last', function() {
        expect(ctx.plotData[0].info.alias).to.be('series2');
        expect(ctx.plotData[1].info.alias).to.be('series1');
      });
    });

    graphScenario('when series is hidden', function(ctx) {
      ctx.setup(function(scope) {
        scope.hiddenSeries = {'series2': true};
      });

      it('should remove datapoints and disable stack', function() {
        expect(ctx.plotData[0].info.alias).to.be('series1');
        expect(ctx.plotData[1].data.length).to.be(0);
        expect(ctx.plotData[1].stack).to.be(false);
      });
    });

  });
});

