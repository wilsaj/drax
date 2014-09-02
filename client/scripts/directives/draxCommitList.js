angular.module('draxApp')
  .directive('draxCommitList', function() {
    'use strict';
    return {
      restrict: 'A',
      templateUrl: 'commit-list.html',
      controller: function ($scope) {
        $scope.commitList = [];
        $scope.$watch('commits', function (value) {
          $scope.commitList = _.values(value);
        });
      }
    };
  });
