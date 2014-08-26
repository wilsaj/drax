var draxApp = (function () {
  'use strict';

  var draxApp = angular.module('draxApp', [])
    .factory('DataService', DataService)
    .controller('draxCtrl', draxCtrl)
    .directive('draxCommit', draxCommit);

  return draxApp;
})();
