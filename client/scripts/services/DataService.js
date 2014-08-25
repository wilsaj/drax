var DataService = function ($http)  {
  'use strict';

  var apiPre = '/api/v1/';

  DataService = {};

  DataService.getCommits = function getCommits() {
    return $http.get(apiPre + '/commits')
      .then(function (resp) {
        return resp.data.commits;
      });
  };


  return DataService;
};
