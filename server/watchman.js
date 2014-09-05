'use strict';
var fs = require('fs');
var path = require('path');

var chokidar = require('chokidar');

var util = require('./util');

function watchman (io, config) {
  var watcher;

  var waitTimeout = 100;
  var waiting = false;
  var watchDir = path.join(config.get('repoPath'), '.git', 'objects');


  function emitCommits (a, b, c) {
    if (!waiting) {
      setTimeout(function () {
        util.commits(config.get('repoPath'), config.get('outDir'))
          .then(function (commits) {
            io.emit('update', {
              commits: commits
            });
          });

        waiting = false;
      }, waitTimeout);

      waiting = true;
    }
  }

  function start () {
    if (!watcher) {
      watcher = chokidar.watch(watchDir);
      watcher.on('add', emitCommits);
      watcher.on('addDir', emitCommits);
      watcher.on('change', emitCommits);
    }
  }

  function stop () {
    watcher.close();
  }

  return {
    start: start,
    stop: stop
  };
}

module.exports = watchman;
