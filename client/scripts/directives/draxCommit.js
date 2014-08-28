angular.module('draxApp')
  .directive('draxCommit', function(DataService, SocketService) {
    'use strict';
    return {
      restrict: 'A',
      templateUrl: 'commit.html',
      controller: function ($scope) {

        SocketService.on('build', function (message) {
          if (message.commit === $scope.commit.hash) {
            $scope.commit.status = message.status;
          }
        });

        $scope.build = function () {
          DataService.build($scope.commit.hash)
            .then(function (status) {
              $scope.commit.status = status;
            });
        };
      }
    };
  });
