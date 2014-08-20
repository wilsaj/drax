'use strict';

var Promise = require('bluebird');
var execAsync = Promise.promisify(require('child_process').exec);
var _s  = require('underscore.string');


function git(subcommand, repoPath) {
  var options = {};

  if (repoPath !== undefined) {
    options.cwd = repoPath;
  }

  return execAsync('git ' + subcommand, options)
    .spread(function(stdout, stderr) {
      return stdout;
    });
}

var util = {
  branches: function branches(repoPath) {
    return git('branch -r', repoPath)
      .then(function(output) {
        return output
          .split('\n')
          .filter(function(line) {
            return line && !_s.startsWith(line, '  origin/HEAD ->');
          })
          .map(function(line) {
            return line.substr(9);
          });
      })
      .catch(function(error) {
        console.log("git branches error: " + error.message);
      });
  },
  build: function build(branch, repoPath) {
    var remoteBranch = 'origin/' + branch;
    var buildOut = 'origin/' + branch;
    return git('checkout ' + remoteBranch, repoPath)
      .then(function() {
        return execAsync('npm install && gulp dist', {cwd: repoPath});
      });
  },
  clone: function clone(url, repoPath) {
    return git('clone ' + url + ' ' + repoPath);
  }
};

module.exports = util;
