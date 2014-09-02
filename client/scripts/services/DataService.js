angular.module('draxApp')
  .factory('DataService', function ($http)  {
    'use strict';

    var apiPre = '/api/v1/';

    var DataService = {};

    DataService.build = function build(commit) {
      return $http.get(apiPre + '/build/' + commit)
        .then(function (resp) {
          return resp.data.status;
        });
    };

    DataService.deploy = function deploy(name, commit) {
      return $http.get(apiPre + '/deploy/' + name + '/' + commit)
        .then(function (resp) {
          return resp.data;
        });
    };

    DataService.deployments = function deployments() {
      return $http.get(apiPre + '/deployments')
        .then(function (resp) {
          return resp.data;
        });
    };

    DataService.getCommits = function getCommits() {
      return $http.get(apiPre + '/commits')
        .then(function (resp) {
          var commits = {};

          _.forEach(resp.data.commits, function(commit) {
            commit.date = moment.unix(commit.timestamp);
            commits[commit.hash] = commit;
          });

          return commits;
        });
    };


    return DataService;
  });
