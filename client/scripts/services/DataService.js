angular.module('draxApp')
  .factory('DataService', function ($http)  {
    'use strict';

    var apiPre = '/api/v1/';

    var DataService = {};

    function processCommits (commitList) {
      var commits = {};

      _.forEach(commitList, function(commit) {
        commit.date = moment.unix(commit.timestamp);
        commits[commit.hash] = commit;
      });

      return commits;
    }

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

    DataService.fetch = function fetch () {
      return $http.get(apiPre + '/fetch')
        .then(function (resp) {
          return resp.data;
        });
    };

    DataService.getCommits = function getCommits() {
      return $http.get(apiPre + '/commits')
        .then(function (resp) {
          return processCommits(resp.data.commits);
        });
    };

    DataService.processCommits = processCommits;

    return DataService;
  });
