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
  build: function build(commit, repoPath) {
    var distPath = repoPath + '/.dist';
    var outPath = '/tmp/' + commit + '/';

    return git('checkout ' + commit, repoPath)
      .then(function() {
        return execAsync('npm install && gulp dist && rm -rf ' + outPath + ' && mv ' + distPath + ' ' + outPath, {cwd: repoPath});
      });
  },
  clone: function clone(url, repoPath) {
    return git('clone ' + url + ' ' + repoPath);
  },
  commits: function commits(repoPath) {
    // separator that won't naturally occur in any part of commit log
    var propertySep = '::-PROPERTYSEP-::';
    var commitSep = '::-COMMITSEP-::';

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
    var formatStr = attrs.map(function(attr) {return attr[0];}).join(propertySep) + commitSep;

    return git('log --all --topo-order --format=format:' + formatStr, repoPath)
      .then(function(output) {
        output = output.slice(0, -1 * commitSep.length);
        var commitStrs = output.split(commitSep + '\n');
        var commits = commitStrs.map(function (commitStr) {
          var commit = {};

          commitStr.split(propertySep).forEach(function (value, i) {
            var key = attrs[i][1];
            commit[key] = value;
          });

          commit.branches = _s.trim(commit.branches, ' ()')
            .split(', ')
            .filter(function (branch) {
              return branch.length > 0;
            });

          return commit;
        });

        return commits;
      });
  },
  hashFor: function hashFor(name, repoPath) {
    return execAsync('git log --format=format:%H -1 ' + name, {cwd: repoPath})
      .then(function (output) {
        return output[0];
      })
      .catch(function(error) {
        if (_s.include(error.message, 'unknown revision or path not in the working tree')) {
          throw "No commit or branch found for: " + name;
        }
        else {
          throw error.message;
        }
      });
  }
};

module.exports = util;
