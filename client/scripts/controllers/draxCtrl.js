angular.module('draxApp')
  .controller('draxCtrl', function ($scope, DataService, SocketService) {
    'use strict';

    $scope.commits = {};
    $scope.deployments = {};

    $scope.deploy = function (name, commit) {
      if (name) {
        DataService.deploy(name, commit);
      }
    };

    DataService.getCommits()
      .then(function (commits) {
        $scope.commits = commits;
      });

    DataService.deployments()
      .then(function (deployments) {
        $scope.deployments = deployments;
      });

    SocketService.on('build', function (message) {
      var commit = $scope.commits[message.commit];
      commit.status = message.status;
    });
  });
