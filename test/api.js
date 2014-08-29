'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var assert = require('assert');
var async = require('async');
var io = require('socket.io-client');
var request = require('supertest');
var should = require('should');

var repoPath = path.join(__dirname, '.test-repo');
var outDir = path.join(__dirname, '.test-out');
var outDirSlow = outDir + '-slow';


var testPort = 7357;

var conf = {
  'repoPath': repoPath,
  'outDir': outDir,
  'buildCommand': 'mkdir -p .dist && cp -r ./* .dist',
  'NODE_ENV': 'test',
  'port': testPort
};

var server = require('../.dist/server')(conf);
var app = server.app;


var slowConf = {
  'repoPath': repoPath,
  'outDir': outDirSlow,
  'buildCommand': 'sleep 1 && mkdir -p .dist && cp -r ./* .dist',
  'NODE_ENV': 'test',
  'port': testPort + 1
};

var slowBuildApp = require('../.dist/server')(slowConf).app;

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


// helper for testing websocket messages; returns a function to call with the
// incoming websocket message as an argument
//   expected is an array of message objects in the order that they are expected
//   callback will be called after the last expected message comes in
function expectSocketMessages(expected, callback) {
  var i = 0;

  return function processMessage(message) {
    var expectedMessage = expected[i];
    assert.deepEqual(expectedMessage, message);
    i += 1;

    if (i === expected.length) {
      callback();
    }
  };
}


function watchFor(watchDir, watchFile, callback) {
  return fs.watch(watchDir, {interval: 10}, function(event, filename) {
    if (filename === watchFile) {
      callback();
    }
  });
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
        'mkdir -p some-dir',
        'echo "here be words" >> some-dir/index.html',
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
      'rm -rf ' + repoPath,
      'rm -rf ' + outDir,
      'rm -rf ' + outDirSlow
    ], {}, done);
  });

  describe('/build', function() {
    it('building should work for branch names', function (done) {
      var buildName = 'master';

      exec('git log -1 --format=format:%H ' + buildName, {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        request(app)
          .get(apiPre + '/build/' + buildName)
          .expect(200)
          .end(function(err, res){
            assert.equal(res.text, JSON.stringify({status: 'building'}));

            var testPath = path.join(outDir, commit, 'hi.txt');

            watchFor(outDir, commit, function() {
              fs.readFile(testPath, function(err, data) {
                assert.equal(data.toString(), 'hello\n');
                done();
              });
            });

            if (err) {return done(err);}
          });
      });
    });

    it('building should work for full commit hashes', function (done) {
      exec('git log -1 --all --skip 4 --topo-order --format=format:%H', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        request(app)
          .get(apiPre + '/build/' + commit)
          .expect(200)
          .end(function(err, res){
            assert.equal(res.text, JSON.stringify({status: 'building'}));

            watchFor(outDir, commit, function() {
              var testPath = path.join(outDir, commit, 'hi.txt');

              fs.readFile(testPath, function(err, data) {
                assert.equal(data.toString(), 'hi\n');
                done();
              });
            });

            if (err) {return done(err);}
          });
      });
    });


    it('building should work for partial commit hashes', function (done) {
      exec('git log -1 --format=format:%H another-branch', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;
        var partialCommit = commit.substr(0, 10);

        request(app)
          .get(apiPre + '/build/' + partialCommit)
          .expect(200)
          .end(function(err, res){
            assert.equal(res.text, JSON.stringify({status: 'building'}));

            watchFor(outDir, commit, function() {
              var testPath = path.join(outDir, commit, 'hi.txt');

              fs.readFile(testPath, function(err, data) {
                assert.equal(data.toString(), 'hello\nexciting and different things\n');
                done();
              });
            });

            if (err) {return done(err);}
          });
      });
    });
  });

  describe('/commits', function() {
    it('GET should return an object containing all commits', function (done) {
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
              body: '',
              status: 'built'
            }, {
              branches: ['some-branch'],
              authorName: 'Testing Testerson',
              authorEmail: 'testdude81@aol.com',
              subject: 'some-branch commit pt. 2',
              body: '',
              status: 'not built'
            }, {
              branches: [],
              authorName: 'Testerina Testski',
              authorEmail: 'testpower3726@aol.com',
              subject: 'some-branch commit',
              body: '',
              status: 'not built'
            }, {
              branches: [ 'HEAD', 'master' ],
              authorName: 'Testerina Testski',
              authorEmail: 'testpower3726@aol.com',
              subject: 'changed',
              body: 'I mean seriously.\n\nwe totally changed this\n',
              status: 'built'
            }, {
              branches: [],
              authorName: 'Testing Testerson',
              authorEmail: 'testdude81@aol.com',
              subject: 'initial commit',
              body: 'starting off\n',
              status: 'built'
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



  describe('/preview', function() {
    it('preview should work for existing commits and files', function (done) {
      exec('git log -1 --format=format:%H master', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        request(app)
          .get(apiPre + '/preview/' + commit + '/hi.txt')
          .expect(200)
          .end(function(err, res){
            assert.equal(res.text, 'hello\n');

            if (err) {return done(err);}
            done();
          });
      });
    });
  });


  describe('/status', function() {
    it('should return "built" status for built commits', function (done) {
      exec('git log -1 --format=format:%H master', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        request(app)
          .get(apiPre + '/status/' + commit)
          .expect(200, JSON.stringify({status: 'built'}), done);
      });
    });

    it('should return "not built" status for non-built commits', function (done) {
      exec('git log -1 --skip 1 --format=format:%H some-branch', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        request(app)
          .get(apiPre + '/status/' + commit)
          .expect(200, JSON.stringify({status: 'not built'}), done);
      });
    });

    it('should return "building" status for builds in process', function (done) {
      exec('git log -1 --skip 1 --format=format:%H some-branch', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        request(slowBuildApp)
          .get(apiPre + '/build/' + commit)
          .end(function (err, res) {
            setTimeout(function () {
              request(slowBuildApp)
                .get(apiPre + '/status/' + commit)
                .expect(200, JSON.stringify({status: 'building'}), done);
            }, 10);
          });
      });
    });

    it('should return 404 for non-existant commits', function (done) {
      var commit = '15a52b49cfb3217a64b77b755bc3a10e6c3f2fc8';

      request(app)
        .get(apiPre + '/status/' + commit)
        .expect(404, done);
    });
  });

  describe('websockets', function() {
    beforeEach(function (done) {
      server.start(testPort, done);
    });

    afterEach(function (done) {
      server.stop(done);
    });

    it('/build should emit messages at start and end of build', function (done) {
      exec('git log -1 --all --skip 4 --topo-order --format=format:%H', {cwd: repoPath}, function (err, stdout, stderr) {
        var commit = stdout;

        var socket = io.connect("http://0.0.0.0:" + testPort);

        var expected = [
          {
            commit: commit,
            status: "building"
          }, {
            commit: commit,
            status: "built"
          }
        ];

        var processMessage = expectSocketMessages(expected, function () {
          socket.disconnect();
          done();
        });

        socket.on("connect", function () {
          socket.on("build", function (message) {
            processMessage(message);
          });

          request(app)
            .get(apiPre + '/build/' + commit)
            .expect(200)
            .end(function () {});
        });
      });
    });
  });
});
