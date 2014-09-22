'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

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

