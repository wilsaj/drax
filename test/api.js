'use strict';

var exec = require('child_process').exec;
var path = require('path');

var async = require('async');
var request = require('supertest');
var should = require('should');

var repoPath = path.join(__dirname, '.tmp/test-repo');

var conf = {
  'repoPath': repoPath,
  'NODE_ENV': 'test'
};

var app = require('../.dist/server')(conf).app;

var apiPre = '/api/v1/';


function execSeries(array, callback) {
  return async.series(array.map(function(execArgs) {
    if (typeof execArgs === 'string') {
      return function(callback) {
        exec(execArgs, callback);
      };
    } 
    else {
      return function(callback) {
        exec(execArgs[0], execArgs[1], callback);
      };
    }
  }), callback);
}


describe('/api/v1/', function () {
  before(function (done) {
    execSeries([
      'rm -rf ' + repoPath,
      'mkdir -p ' + repoPath,
      ['git init', {cwd: repoPath}],
      ['echo "hi" > hi.txt', {cwd: repoPath}],
      ['git add .', {cwd: repoPath}],
      ['git commit -m "initial commit"', {cwd: repoPath}],
      ['echo "hello" > hi.txt', {cwd: repoPath}],
      ['git add .', {cwd: repoPath}],
      ['git commit -m "changed"', {cwd: repoPath}]
    ], done);
  });


  describe('/commits', function() {
    it('GET should return something"', function (done) {
      request(app)
        .get(apiPre + '/commits')
        .expect(200, done);
    });
  });
});
