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
  },
  commits: function commits(repoPath) {
    // separator that won't naturally occur in any part of commit log
    var sep = '::-SEP-::';

    // list of attributes to pull out of commit long, in format:
    //   [formatStringPlaceholder, name]
    // for possible placeholders see format:<string> section of git log --help
    var attrs = [
      ['%H', 'hash'],
      ['%d', 'branches'],
      ['%aN', 'authorName'],
      ['%ae', 'authorEmail'],
      ['%s', 'subject'],
      ['%b', 'body']
    ];
    var formatStr = attrs.map(function(attr) {return attr[0];}).join(sep);

    return git('log --all --format=format:' + formatStr, repoPath)
      .then(function(output) {
        var commits = output.split('\n').map(function (line) {
          var commit = {};

          line.split(sep).forEach(function (value, i) {
            var key = attrs[i][1];
            commit[key] = value;
          });

          commit.branches = _s.trim(commit.branches, ' ()').split(', ');

          return commit;
        });

        return commits;
      });
  }
};

module.exports = util;
