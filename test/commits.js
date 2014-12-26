'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var moment = require('moment');
var request = require('supertest');
var test = require('tape');

var draxTest = require('./testUtil');
var server = require('../.dist/server');

var apiPre = '/api/v1/';


test('commit tests', function (t) {
  var dir = path.join(draxTest.testDir, 'commits');
  var config = draxTest.makeConfig(dir);
  var app = server(config).app;

  var repoPath = config.repoPath;
  var outDir = config.outDir;


  draxTest.setup(config, t);

  t.test('GET should return an object containing all commits', function (t2) {
    t2.plan(1 + draxTest.baseCommits.length * 8);

    request(app)
      .get(apiPre + '/commits')
      .expect(200)
      .end(function(err, res){
        var commits = JSON.parse(res.text).commits;
        t2.equal(commits.length,  5);

        commits.forEach(function (commit, index) {
          var commitTest = draxTest.baseCommits[index];

          t2.equal(commit.hash.length, 40);

          var parsedDate = moment.unix(commit.timestamp);
          t2.assert(parsedDate.isValid());

          Object.keys(commitTest).forEach(function (key) {
            t2.deepEqual(commitTest[key], commit[key]);
          });
        });
      });
  });

  t.test('GET should respect limit, if set', function (t2) {
    t2.plan(1 + 2 * 8);

    request(app)
      .get(apiPre + '/commits')
      .send({limit: 2})
      .expect(200)
      .end(function(err, res){
        var commits = JSON.parse(res.text).commits;
        t2.equal(commits.length,  2);

        commits.forEach(function (commit, index) {
          var commitTest = draxTest.baseCommits[index];

          t2.equal(commit.hash.length, 40);

          var parsedDate = moment.unix(commit.timestamp);
          t2.assert(parsedDate.isValid());

          Object.keys(commitTest).forEach(function (key) {
            t2.deepEqual(commitTest[key], commit[key]);
          });
        });
      });
  });

  draxTest.teardown(config, t);
});
