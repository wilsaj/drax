angular.module('draxApp')
  .directive('draxCommit', function(DataService) {
    'use strict';
    return {
      restrict: 'A',
      templateUrl: 'commit.html',
      controller: function ($scope) {
        $scope.deployedTo = [];

        $scope.build = function () {
          DataService.build($scope.commit.hash)
            .then(function (status) {
              $scope.commit.status = status;
            });
        };

        $scope.$watch('deployments', function (deployments) {
          $scope.deployedTo = _.filter(deployments, {'commit': $scope.commit.hash});
        });
      }
    };
  });
