'use strict';

var exec = require('child_process').exec;
var path = require('path');

var assert = require('assert');
var async = require('async');
var request = require('supertest');
var should = require('should');

var repoPath = path.join(__dirname, '.test-repo');

var conf = {
  'repoPath': repoPath,
  'NODE_ENV': 'test'
};

var app = require('../.dist/server')(conf).app;

var apiPre = '/api/v1/';



// helper function for running exec commands in series
//   commands - strings of shell commands
//   options  - options that will be passed to child_process.exec
//   callback - will be called once all of the commands have run
function execSeries(commands, options, callback) {
  return async.series(commands.map(function(command) {
    return function(callback) {
      exec(command, options, callback);
    };
  }), callback);
}


describe('/api/v1/', function () {
  before(function (done) {
    execSeries([
      'rm -rf ' + repoPath,
      'mkdir -p ' + repoPath
    ], {}, function () {
      execSeries([
        'git init',
        'echo "hi" > hi.txt',
        'git add .',
        'git commit -m "initial commit" -m "starting off" --author="Testing Testerson <testdude81@aol.com>"',
        'echo "hello" > hi.txt',
        'git add .',
        'git commit -m "changed" -m "I mean seriously." -m "we totally changed this" --author="Testerina Testski <testpower3726@aol.com>"',
        'git checkout -b some-branch',
        'echo "more things" >> hi.txt',
        'git add .',
        'git commit -m "some-branch commit" --author="Testerina Testski <testpower3726@aol.com>"',
        'git checkout master',
        'git checkout -b another-branch',
        'echo "exciting and different things" >> hi.txt',
        'git add .',
        'git commit -m "different things" --author="Testerina Testski <testpower3726@aol.com>"',
        'git checkout some-branch',
        'echo "even more things" >> hi.txt',
        'git add .',
        'git commit -m "some-branch commit pt. 2" --author="Testing Testerson <testdude81@aol.com>"',
        'git checkout master'
      ], {cwd: repoPath}, done);
    });
  });

  after(function (done) {
    execSeries([
      'rm -rf ' + repoPath
    ], {}, done);
  });

  describe('/commits', function() {
    it('GET should return an object containing all commits"', function (done) {
      request(app)
        .get(apiPre + '/commits')
        .expect(200)
        .end(function(err, res){
          var commits = JSON.parse(res.text).commits;
          assert.equal(commits.length,  5);

          var commitTests = [
            {
              branches: ['another-branch'],
              authorName: 'Testerina Testski',
              authorEmail: 'testpower3726@aol.com',
              subject: 'different things',
              body: ''
            }, {
              branches: [ 'some-branch' ],
              authorName: 'Testing Testerson',
              authorEmail: 'testdude81@aol.com',
              subject: 'some-branch commit pt. 2',
              body: ''
            }, {
              branches: [],
              authorName: 'Testerina Testski',
              authorEmail: 'testpower3726@aol.com',
              subject: 'some-branch commit',
              body: ''
            }, {
              branches: [ 'HEAD', 'master' ],
              authorName: 'Testerina Testski',
              authorEmail: 'testpower3726@aol.com',
              subject: 'changed',
              body: 'I mean seriously.\n\nwe totally changed this\n'
            }, {
              branches: [],
              authorName: 'Testing Testerson',
              authorEmail: 'testdude81@aol.com',
              subject: 'initial commit',
              body: 'starting off\n'
            }
          ];

          commits.forEach(function (commit, index) {
            var commitTest = commitTests[index];

            assert.equal(commit.hash.length, 40);

            Object.keys(commitTest).forEach(function (key) {
              assert.deepEqual(commitTest[key], commit[key]);
            });
          });

          if (err) {return done(err);}
          done();
        });
    });
  });
});
