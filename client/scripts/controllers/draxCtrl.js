angular.module('draxApp')
  .controller('draxCtrl', function ($scope, DataService, SocketService) {
    'use strict';

    $scope.commits = {};
    $scope.deployments = {};
    $scope.limit = 50;

    $scope.deploy = function (name, commit) {
      if (name) {
        DataService.deploy(name, commit);
      }
    };

    $scope.getCommits = function () {
      DataService.getCommits($scope.limit)
        .then(function (commits) {
          $scope.commits = commits;
          $scope.moreCommitsAvailable = Object.keys(commits).length == $scope.limit;
        });
    };

    $scope.fetch = function fetch() {
      DataService.fetch();
    };

    $scope.moreCommits = function moreCommits() {
      $scope.limit += 50;
    };

    DataService.deployments()
      .then(function (deployments) {
        $scope.deployments = deployments;
      });

    SocketService.on('build', function (message) {
      var commit = $scope.commits[message.commit];
      commit.status = message.status;

      // XXX: hacks
      $scope.getCommits();
    });

    SocketService.on('deploy', function (message) {
      $scope.deployments = message.deployments;

      // XXX: hacks
      DataService.deployments();
    });

    SocketService.on('update', function (message) {
      $scope.commits = DataService.processCommits(message.commits);
    });

    $scope.$watch('limit', function (value) {
      if(value) {
        $scope.getCommits(value);
      }
    });
  });
