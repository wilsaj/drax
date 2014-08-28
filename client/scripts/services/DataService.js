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

    DataService.getCommits = function getCommits() {
      return $http.get(apiPre + '/commits')
        .then(function (resp) {
          return resp.data.commits;
        });
    };


    return DataService;
  });
