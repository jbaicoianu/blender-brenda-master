define([
  'angular',
  'lodash',
  'jquery',
],
function (angular, _, $) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('dashboardViewStateSrv', function($location, $timeout) {

    // represents the transient view state
    // like fullscreen panel & edit
    function DashboardViewState($scope) {
      var self = this;
      self.state = {};
      self.panelScopes = [];
      self.$scope = $scope;

      $scope.exitFullscreen = function() {
        if (self.state.fullscreen) {
          self.update({ fullscreen: false });
        }
      };

      $scope.onAppEvent('$routeUpdate', function() {
        var urlState = self.getQueryStringState();
        if (self.needsSync(urlState)) {
          self.update(urlState, true);
        }
      });

      this.update(this.getQueryStringState(), true);
    }

    DashboardViewState.prototype.needsSync = function(urlState) {
      return _.isEqual(this.state, urlState) === false;
    };

    DashboardViewState.prototype.getQueryStringState = function() {
      var queryParams = $location.search();
      var urlState = {
        panelId: parseInt(queryParams.panelId) || null,
        fullscreen: queryParams.fullscreen ? true : false,
        edit: queryParams.edit ? true : false,
      };

      _.each(queryParams, function(value, key) {
        if (key.indexOf('var-') !== 0) { return; }
        urlState[key] = value;
      });

      return urlState;
    };

    DashboardViewState.prototype.serializeToUrl = function() {
      var urlState = _.clone(this.state);
      urlState.fullscreen = this.state.fullscreen ? true : null,
      urlState.edit = this.state.edit ? true : null;

      return urlState;
    };

    DashboardViewState.prototype.update = function(state, skipUrlSync) {
      _.extend(this.state, state);
      this.fullscreen = this.state.fullscreen;

      if (!this.state.fullscreen) {
        this.state.panelId = null;
        this.state.edit = false;
      }

      if (!skipUrlSync) {
        $location.search(this.serializeToUrl());
      }

      this.syncState();
    };

    DashboardViewState.prototype.syncState = function() {
      if (this.panelScopes.length === 0) { return; }

      if (this.fullscreen) {
        if (this.fullscreenPanel) {
          this.leaveFullscreen(false);
        }
        var panelScope = this.getPanelScope(this.state.panelId);
        this.enterFullscreen(panelScope);
        return;
      }

      if (this.fullscreenPanel) {
        this.leaveFullscreen(true);
      }
    };

    DashboardViewState.prototype.getPanelScope = function(id) {
      return _.find(this.panelScopes, function(panelScope) {
        return panelScope.panel.id === id;
      });
    };

    DashboardViewState.prototype.leaveFullscreen = function(render) {
      var self = this;

      self.fullscreenPanel.editMode = false;
      self.fullscreenPanel.fullscreen = false;
      delete self.fullscreenPanel.height;

      if (!render) { return false;}

      $timeout(function() {
        if (self.oldTimeRange !== self.fullscreenPanel.range) {
          self.$scope.dashboard.emit_refresh();
        }
        else {
          self.fullscreenPanel.$emit('render');
        }
        delete self.fullscreenPanel;
      });
    };

    DashboardViewState.prototype.enterFullscreen = function(panelScope) {
      var docHeight = $(window).height();
      var editHeight = Math.floor(docHeight * 0.3);
      var fullscreenHeight = Math.floor(docHeight * 0.7);
      this.oldTimeRange = panelScope.range;

      panelScope.height = this.state.edit ? editHeight : fullscreenHeight;
      panelScope.editMode = this.state.edit;
      this.fullscreenPanel = panelScope;

      $(window).scrollTop(0);

      panelScope.fullscreen = true;

      $timeout(function() {
        panelScope.$emit('render');
      });
    };

    DashboardViewState.prototype.registerPanel = function(panelScope) {
      var self = this;
      self.panelScopes.push(panelScope);

      if (self.state.panelId === panelScope.panel.id) {
        self.enterFullscreen(panelScope);
      }

      panelScope.$on('$destroy', function() {
        self.panelScopes = _.without(self.panelScopes, panelScope);
      });
    };

    return {
      create: function($scope) {
        return new DashboardViewState($scope);
      }
    };

  });
});
