angular.module('draxApp')
  .controller('draxCtrl', function ($scope, DataService, SocketService) {
    'use strict';

    $scope.commits = {};

    DataService.getCommits()
      .then(function (commits) {
        $scope.commits = commits;
      });

    SocketService.on('build', function (message) {
      var commit = $scope.commits[message.commit];
      commit.status = message.status;
    });
  });
