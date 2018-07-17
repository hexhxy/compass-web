(function() {
  define(['angular', 'uiRouter', 'angularTable', 'uiBootstrap', 'angularDragDrop', 'ngSpinner', 'ngBsDaterangepicker', 'angularAnimate'], function(ng) {
    'use strict';
     console.log("You are heree....");
    return ng.module('compass.controllers', ['ui.router', 'ngTable', 'ui.bootstrap', 'ngDragDrop', 'angularSpinner', 'ngBootstrap', 'ngAnimate']);
  });

}).call(this);
