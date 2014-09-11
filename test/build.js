'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var request = require('supertest');
var test = require('tape');

var draxTest = require('./testUtil');
var server = require('../.dist/server');

var apiPre = '/api/v1/';


test('build tests', function (t) {
  var dir = path.join(draxTest.testDir, 'build');
  var config = draxTest.makeConfig(dir);
  var app = server(config).app;

  var repoPath = config.repoPath;
  var outDir = config.outDir;
  var deployDir = config.deployDir;

  draxTest.setup(config, t);

  t.test('building should work for branch names', function (t2) {
    t2.plan(2);

    var buildName = 'master';

    exec('git log -1 --format=format:%H ' + buildName, {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;

      request(app)
        .get(apiPre + '/build/' + buildName)
        .expect(200)
        .end(function(err, res){
          t2.equal(res.text, JSON.stringify({status: 'building'}));

          var testPath = path.join(outDir, commit, 'hi.txt');

          draxTest.watchFor(outDir, commit, function() {
            fs.readFile(testPath, function(err, data) {
              t2.equal(data.toString(), 'hello\n');
            });
          });
        });
    });
  });


  t.test('building should work for full commit hashes', function (t2) {
    t2.plan(2);

    exec('git log -1 --all --skip 4 --topo-order --format=format:%H', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;

      request(app)
        .get(apiPre + '/build/' + commit)
        .expect(200)
        .end(function(err, res){
          t2.equal(res.text, JSON.stringify({status: 'building'}));

          draxTest.watchFor(outDir, commit, function() {
            var testPath = path.join(outDir, commit, 'hi.txt');

            fs.readFile(testPath, function(err, data) {
              t2.equal(data.toString(), 'hi\n');
            });
          });
        });
    });
  });


  t.test('building should work for partial commit hashes', function (t2) {
    t2.plan(2);

    exec('git log -1 --format=format:%H another-branch', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;
      var partialCommit = commit.substr(0, 10);

      request(app)
        .get(apiPre + '/build/' + partialCommit)
        .expect(200)
        .end(function(err, res){
          t2.equal(res.text, JSON.stringify({status: 'building'}));

          draxTest.watchFor(outDir, commit, function() {
            var testPath = path.join(outDir, commit, 'hi.txt');

            fs.readFile(testPath, function(err, data) {
              t2.equal(data.toString(), 'hello\nexciting and different things\n');
            });
          });
        });
    });
  });


  t.test('preview should work for built commits', function (t2) {
    t2.plan(1);

    exec('git log -1 --format=format:%H master', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;

      request(app)
        .get(apiPre + '/preview/' + commit + '/hi.txt')
        .expect(200)
        .end(function(err, res){
          t2.equal(res.text, 'hello\n');
        });
    });
  });


  t.test('deploy should work deploy for built commits', function (t2) {
    t2.plan(3);
    exec('git log -1 --format=format:%H master', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;
      var deployName = 'test';

      var testPath = path.join(deployDir, deployName, 'hi.txt');
      draxTest.watchFor(deployDir, 'test', function() {
        fs.readFile(testPath, function(err, data) {
          t2.equal(data.toString(), 'hello\n');
        });
      });

      request(app)
        .get(apiPre + '/deploy/' + deployName + '/' + commit)
        .end(function(err, res){
          t2.equal(200, res.status);
          t2.equal(res.text, JSON.stringify({status: 'deployed'}));
        });
    });
  });


  t.test('deploy should be sucessful when repeated multiple times', function (t2) {
    t2.plan(3);

    exec('git log -1 --format=format:%H another-branch', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;
      var deployName = 'test';

      request(app)
        .get(apiPre + '/deploy/' + deployName + '/' + commit)
        .end(function(err, res){
          t2.equal(200, res.status);
          t2.equal(res.text, JSON.stringify({status: 'deployed'}));

          draxTest.watchFor(deployDir, 'test', function() {
            var testPath = path.join(outDir, commit, 'hi.txt');

            fs.readFile(testPath, function(err, data) {
              t2.equal(data.toString(), 'hello\nexciting and different things\n');
            });
          });
        });
    });
  });


  t.test('deploy should return error status for non-built commits', function (t2) {
    t2.plan(2);

    exec('git log -1 --skip 1 --format=format:%H some-branch', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;

      var expected = {
        status: 'error',
        message: 'no build found for commit: ' + commit
      };

      request(app)
        .get(apiPre + '/deploy/test/' + commit)
        .end(function(err, res){
          t2.equal(200, res.status);
          t2.equal(res.text, JSON.stringify(expected));
        });
    });
  });


  t.test('deploy should return error status for undefined deploy names', function (t2) {
    t2.plan(2);

    exec('git log -1 --skip 1 --format=format:%H some-branch', {cwd: repoPath}, function (err, stdout, stderr) {
      var commit = stdout;

      var deploy = 'special-test';

      var expected = {
        status: 'error',
        message: 'no deployment has been configured for: ' + deploy
      };

      request(app)
        .get(apiPre + '/deploy/' + deploy + '/' + commit)
        .end(function(err, res){
          t2.equal(200, res.status);
          t2.equal(res.text, JSON.stringify(expected));
        });
    });
  });


  draxTest.teardown(config, t);
});
