angular.module('draxApp')
  .controller('draxCtrl', function ($scope, DataService) {
    'use strict';

    $scope.commits = [];

    DataService.getCommits()
      .then(function (commits) {
        $scope.commits = commits;
      });
  });
