define([
  'components/timeSeries'
], function(TimeSeries) {
  'use strict';

  describe("TimeSeries", function() {
    var points, series;
    var yAxisFormats = ['short', 'ms'];
    var testData = {
      info: { alias: 'test' },
      datapoints: [
        [1,2],[null,3],[10,4],[8,5]
      ]
    };

    describe('when getting flot pairs', function() {
      it('with connected style, should ignore nulls', function() {
        series = new TimeSeries(testData);
        points = series.getFlotPairs('connected', yAxisFormats);
        expect(points.length).to.be(3);
      });

      it('with null as zero style, should replace nulls with zero', function() {
        series = new TimeSeries(testData);
        points = series.getFlotPairs('null as zero', yAxisFormats);
        expect(points.length).to.be(4);
        expect(points[1][1]).to.be(0);
      });
    });

    describe('series overrides', function() {
      var series;
      beforeEach(function() {
        series = new TimeSeries(testData);
      });

      describe('fill & points', function() {
        beforeEach(function() {
          series.info.alias = 'test';
          series.applySeriesOverrides([{ alias: 'test', fill: 0, points: true }]);
        });

        it('should set fill zero, and enable points', function() {
          expect(series.lines.fill).to.be(0.001);
          expect(series.points.show).to.be(true);
        });
      });

      describe('series option overrides, bars, true & lines false', function() {
        beforeEach(function() {
          series.info.alias = 'test';
          series.applySeriesOverrides([{ alias: 'test', bars: true, lines: false }]);
        });

        it('should disable lines, and enable bars', function() {
          expect(series.lines.show).to.be(false);
          expect(series.bars.show).to.be(true);
        });
      });

      describe('series option overrides, linewidth, stack', function() {
        beforeEach(function() {
          series.info.alias = 'test';
          series.applySeriesOverrides([{ alias: 'test', linewidth: 5, stack: false }]);
        });

        it('should disable stack, and set lineWidth', function() {
          expect(series.stack).to.be(false);
          expect(series.lines.lineWidth).to.be(5);
        });
      });

      describe('series option overrides, pointradius, steppedLine', function() {
        beforeEach(function() {
          series.info.alias = 'test';
          series.applySeriesOverrides([{ alias: 'test', pointradius: 5, steppedLine: true }]);
        });

        it('should set pointradius, and set steppedLine', function() {
          expect(series.points.radius).to.be(5);
          expect(series.lines.steps).to.be(true);
        });
      });

      describe('override match on regex', function() {
        beforeEach(function() {
          series.info.alias = 'test_01';
          series.applySeriesOverrides([{ alias: '/.*01/', lines: false }]);
        });

        it('should match second series', function() {
          expect(series.lines.show).to.be(false);
        });
      });

      describe('override series y-axis, and z-index', function() {
        beforeEach(function() {
          series.info.alias = 'test';
          series.applySeriesOverrides([{ alias: 'test', yaxis: 2, zindex: 2 }]);
        });

        it('should set yaxis', function() {
          expect(series.info.yaxis).to.be(2);
        });

        it('should set zindex', function() {
          expect(series.zindex).to.be(2);
        });
      });

    });

  });

});
