angular.module('draxApp')
  .directive('draxCommit', function() {
    'use strict';

    return {
      restrict: 'A',
      templateUrl: 'commit.html'
    };
  });
