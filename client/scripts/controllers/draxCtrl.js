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

    $scope.fetch = function fetch() {
      DataService.fetch();
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

      // XXX: hacks
      DataService.getCommits();
    });

    SocketService.on('deploy', function (message) {
      $scope.deployments = message.deployments;

      // XXX: hacks
      DataService.deployments();
    });

    SocketService.on('update', function (message) {
      $scope.commits = DataService.processCommits(message.commits);
    });
  });
