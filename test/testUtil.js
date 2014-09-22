'use strict';

var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var Promise = require('bluebird');
var execAsync = Promise.promisify(exec);

var test = require('tape');

var testDir = path.join(__dirname, '.test-tmp');

var baseRepoPath = path.join(testDir, 'base-repo');

var runningTests = 0;

var baseCommits = [
  {
    branches: ['another-branch'],
    authorName: 'Testerina Testski',
    authorEmail: 'testpower3726@aol.com',
    subject: 'different things',
    body: '',
    status: 'not built'
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
    status: 'not built'
  }, {
    branches: [],
    authorName: 'Testing Testerson',
    authorEmail: 'testdude81@aol.com',
    subject: 'initial commit',
    body: 'starting off\n',
    status: 'not built'
  }
];


function cleanDir(cb) {
  execSeries([
    'rm -rf ' + testDir
  ], {}, cb);
}


// helper function for running exec commands in series
//   commands - strings of shell commands
//   options  - options that will be passed to child_process.exec
function execSeries(commands, opts) {
  opts = opts || {};
  return execAsync(commands.join(' && '), opts);
}

// helper for testing websocket messages; returns a function to call with the
// incoming websocket message as an argument
//   expected is an array of message objects in the order that they are expected
//   callback will be called after the last expected message comes in
function expectSocketMessages(t, expected, callback) {
  var i = 0;

  return function processMessage(message) {
    var expectedMessage = expected[i];
    t.deepEqual(expectedMessage, message);
    i += 1;

    if (i === expected.length) {
      callback();
    }
  };
}

function makeBaseRepo() {
  return execSeries([
      'rm -rf ' + baseRepoPath,
      'mkdir -p ' + baseRepoPath
    ])
    .then(function() {
      return execSeries([
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
      ], {cwd: baseRepoPath});
    });
}


function makeConfig(dir, overrides) {
  overrides = overrides || {};

  var repoPath = path.join(dir, 'repo');
  var deployDir = path.join(dir, 'deploy');

  var defaults = {
    'testDir': dir,
    'repoPath': path.join(dir, 'repo'),
    'deployDir': deployDir,
    'outDir': path.join(dir, 'out'),
    'buildCommand': 'mkdir -p .dist && cp -r ./* .dist',
    'NODE_ENV': 'test',
    'port': 7357,
    'deployments': [
      {
        "name": 'test',
        "path": deployDir + '/test'
      }, {
        "name": 'staging',
        "path": deployDir + '/staging'
      }
    ]
  };

  return _.assign(defaults, overrides);
}

function makeTestRepo(testRepoPath) {
  return makeBaseRepo()
    .then(function () {
      return execSeries([
        'rm -rf ' + testRepoPath,
        'cp -r ' + baseRepoPath + ' ' + testRepoPath
      ]);
    });
}

function setup(config, t, server) {
  var testRepoPath = config.repoPath;
  var outDir = config.outDir;
  var deployDir = config.deployDir;

  function startServer() {
    return new Promise(function (resolve, reject) {
      if (server) {
        server.start(config.port, resolve);
      }
      else {
        resolve();
      }
    });
  }

  t.test('setup', function(setupTest) {
    runningTests++;

    Promise.all([
      makeTestRepo(testRepoPath),
      execAsync('mkdir -p ' + outDir),
      execAsync('mkdir -p ' + deployDir)
    ])
      .then(function () {
        startServer()
          .then(function () {
            setupTest.end();
          });
      });
  });
}

function teardown(config, t, timeout, server) {
  timeout = timeout || 0;

  function stopServer() {
    return new Promise(function (resolve, reject) {
      if (server) {
        server.stop(resolve);
      }
      else {
        resolve();
      }
    });
  }

  t.test('teardown', function(teardownTest) {
    setTimeout(function () {
      Promise.all([
        execAsync('rm -rf ' + config.testDir),
        stopServer()
      ])
        .then(function () {
          teardownTest.end();
        });
    }, timeout);
  });
}

function watchFor(watchDir, watchFile, callback) {
  var watcher = fs.watch(watchDir, {interval: 10}, function(event, filename) {
    if (filename === watchFile) {
      watcher.close();
      callback();
    }
  });

  return watcher;
}

module.exports = {
  baseCommits: baseCommits,
  cleanDir: cleanDir,
  execSeries: execSeries,
  expectSocketMessages: expectSocketMessages,
  makeConfig: makeConfig,
  makeTestRepo: makeTestRepo,
  setup: setup,
  teardown: teardown,
  testDir: testDir,
  watchFor: watchFor
};
