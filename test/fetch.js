'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var io = require('socket.io-client');
var request = require('supertest');
var test = require('tape');

var draxTest = require('./testUtil');
var server = require('../.dist/server');

var apiPre = '/api/v1/';


test('fetch tests', function (t) {
  var dir = path.join(draxTest.testDir, 'fetch');
  var config = draxTest.makeConfig(dir);
  var app = server(config).app;

  var repoPath = config.repoPath;
  var outDir = config.outDir;

  draxTest.setup(config, t);

  t.test('should fetch recent changes', function (t2) {
    t2.plan(2);

    var otherRepoPath = repoPath + '-fetch-test';

    draxTest.execSeries([
      'git clone ' + repoPath + ' ' + otherRepoPath
    ], {})
    .then(function () {
      draxTest.execSeries([
            'echo "new thing" > update.txt',
            'git add .',
            'git commit -m "new thing is updated" --author="Testing Testerson <testdude81@aol.com>"',
          ], {cwd: otherRepoPath})
        .then(function () {
          exec('git log -1 --format=format:%H', {cwd: otherRepoPath}, function (err, stdout, stderr) {
            var commit = stdout;
            draxTest.execSeries([
                  'git remote add origin ' + otherRepoPath,
                ], {cwd: repoPath})
              .then(function () {
                request(app)
                  .get(apiPre + '/fetch')
                  .end(function(err, res) {
                    t2.equal(res.status, 200);
                    t2.equal(stdout, commit);
                  });
              });
            });
        });
    });
  });

  draxTest.teardown(config, t);
});


test('websockets fetch tests', function (t) {
  var dir = path.join(draxTest.testDir, 'fetch-websockets');
  var testPort = 6460;
  var config = draxTest.makeConfig(dir, {
    'buildCommand': 'mkdir -p .dist && cp -r ./* .dist',
    'port': testPort
  });
  var testServer  = server(config);
  var repoPath = config.repoPath;

  draxTest.setup(config, t, testServer);

  t.test('should emit update message when new commits come in', function (t2) {
    t2.plan(1);
    var otherRepoPath = repoPath + '-fetch-websockets-otherRepo';

    draxTest.execSeries([
          'git clone ' + repoPath + ' ' + otherRepoPath
        ], {})
      .then(function () {
        return draxTest.execSeries([
          'echo "more new thing" >> update.txt',
          'git add .',
          'git commit -m "more new thing for us" --author="Testing Testerson <testdude81@aol.com>"'
        ], {cwd: otherRepoPath});
      }).then(function () {
        setTimeout(function () {
          var socket = io.connect("http://0.0.0.0:" + testPort, {'force new connection': true});
          socket.on("connect", function (message) {
            socket.on("update", function (message) {
              t2.equal(message.commits.length, draxTest.baseCommits.length + 1);
              socket.disconnect();
            });

            draxTest.execSeries([
              'git remote add websockets-test ' + otherRepoPath,
              'git fetch --all'
            ], {cwd: repoPath}, function (err, stdout, stderr) {
            });
          });
        }, 1000);
      });
    });

  draxTest.teardown(config, t, 0, testServer);
});
