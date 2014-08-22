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
        'git commit -m "initial commit"',
        'echo "hello" > hi.txt',
        'git add .',
        'git commit -m "changed"',
        'git checkout -b some-branch',
        'echo "more things" >> hi.txt',
        'git add .',
        'git commit -m "some-branch commit"',
        'git checkout master',
        'git checkout -b another-branch',
        'echo "exciting and different things" >> hi.txt',
        'git add .',
        'git commit -m "different things"',
        'git checkout some-branch',
        'echo "even more things" >> hi.txt',
        'git add .',
        'git commit -m "some-branch commit pt. 2"',
        'git checkout master'
        ], {cwd: repoPath}, done);
    });
  });

  describe('/commits', function() {
    it('GET should return an object containing all commits"', function (done) {
      request(app)
        .get(apiPre + '/commits')
        .expect(200)
        .end(function(err, res){
          var commits = JSON.parse(res.text).commits;
          assert.equal(commits.length,  5);

          if (err) {return done(err);}
          done();
        });
    });
  });
});
