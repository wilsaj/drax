'use strict';
var fs = require('fs');
var path = require('path');

var Promise = require('bluebird');
var rimrafAsync = Promise.promisify(require('rimraf'));
var execAsync = Promise.promisify(require('child_process').exec);
var readdirAsync = Promise.promisify(require('fs').readdir);
var readFileAsync = Promise.promisify(require('fs').readFile);
var statAsync = Promise.promisify(require('fs').stat);
var _s  = require('underscore.string');
var _ = require('lodash');

var draxDeployInfoFilename = '.drax-deploy-info';

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
  build: function build(commit, repoPath, buildCommand, distDir, outDir) {
    var paths = this.buildPaths(commit, outDir, distDir);

    return execAsync([
          'rm -rf ' + paths.build,
          'rm -rf ' + paths.info,
          'mkdir -p ' + paths.info,
          'touch ' + paths.status,
          'echo "building" > ' + paths.status,
        ].join(' && '))
      .then(function () {
        return git('clone ' + repoPath + ' ' + paths.build, repoPath)
      })
      .then(function () {
        return git('checkout ' + commit, paths.build);
      })
      .then(function() {
        var command = [
            'touch ' + paths.buildLog,
            '((' + buildCommand + ') > ' + paths.buildLog + ' 2>&1 || echo "error" > ' + paths.status + ')',
            '(mv ' + paths.dist + '/.build_errors ' + paths.buildErrors + ' && echo "error" > ' + paths.status + ' || true)',
            '(cp -R ' + paths.dist + '/* ' + paths.out + ' 2>> ' + paths.buildLog + ' || echo "error" > ' + paths.status + ')',
            '(grep "building" ' + paths.status + ' && echo "built" > ' + paths.status + ' || true)',
            'rm -rf ' + paths.build,
          ].join(' && ');
        return execAsync(command, {cwd: paths.build});
      });
  },
  buildPaths: function buildPaths(commit, outDir, distDir) {
    var paths = {};

    paths.out = path.join(outDir, commit);
    paths.build = paths.out + '-build';
    paths.info = path.join(paths.out, '.drax-info');
    paths.status = path.join(paths.info, 'status');
    paths.buildLog = path.join(paths.info, 'build-log.log');
    paths.buildErrors = path.join(paths.info, 'build-errors.log');
    if (distDir) {
      paths.dist = path.join(paths.build, distDir);
    }

    return paths;
  },
  clearPartials: function clearPartials(outDir) {
    return readdirAsync(outDir)
      .then(function (dirs) {
        var statusPaths = dirs.filter(function (dir) {
          return !_s.endsWith(dir, '-build');
        })
        .map(function (dir) {
          return path.join(dir, '.drax-info/status')
        });

        return Promise.map(statusPaths, function(statusPath) {
          return execAsync('(grep "building" ' + statusPath + ' && rm ' + statusPath + ') || true')
        });
      }).catch(Promise.OperationalError, function (error) {
        if (!_s.startsWith(error.message, 'ENOENT')) {
          throw error;
        }
      });
  },
  clone: function clone(url, repoPath) {
    return git('clone ' + url + ' ' + repoPath);
  },
  commits: function commits(repoPath, outDir, limit, githubRepo) {
    // separator that won't naturally occur in any part of commit log
    var propertySep = '::-PROPERTYSEP-::';
    var commitSep = '::-COMMITSEP-::';
    limit = limit || 50;

    // list of attributes to pull out of commit long, in format:
    //   [formatStringPlaceholder, name]
    // for possible placeholders see format:<string> section of git log --help
    var attrs = [
      ['%H', 'hash'],
      ['%d', 'branches'],
      ['%at', 'timestamp'],
      ['%aN', 'authorName'],
      ['%ae', 'authorEmail'],
      ['%s', 'subject'],
      ['%b', 'body']
    ];
    var formatStr = attrs.map(function(attr) {return attr[0];}).join(propertySep) + commitSep;

    return git('log --all --topo-order --format=format:' + formatStr + ' --max-count=' + limit, repoPath)
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

          if (githubRepo) {
            commit.url = "https://github.com/" + githubRepo + "/commit/" + commit.hash;
          }
          return commit;
        });

        return commits;
      })
      .map(function (commit) {
        return util.status(commit.hash, repoPath, outDir)
          .then(function (status) {
            commit.status = status.status;
            return commit;
          });
      }, {concurrency: 70});
  },
  deployments: function deployments(deploymentConfig) {
    return Promise.map(deploymentConfig, util.deploymentStatus);
  },
  deploymentStatus: function deployStatus(deploymentConfig) {
    var deployment = {
      "name": deploymentConfig.name,
      "commit": null
    };

    var deployInfoPath = path.join(deploymentConfig.path, draxDeployInfoFilename);
    return readFileAsync(deployInfoPath)
      .then(function (data) {
        deployment.commit = data.toString().trim();
        return deployment;
      })
      .catch(function (error) {
        return deployment;
      });
  },
  deploy: function deploy(deployDir, commit, outDir, repoPath, deploymentConfig, io) {
    var builtDir = path.join(outDir, commit);
    var deployDir = _s.rtrim(deployDir, '/');

    return statAsync(builtDir)
      .then(function (stats) {
        var deploySide = deployDir + '.drax-deploying';

        return execAsync([
              'rm -rf ' + deploySide,
              'mkdir -p ' + deploySide,
              'cp -r ' + builtDir + '/* ' + deploySide,
              'echo "' + commit + '" > ' + deploySide + '/' + draxDeployInfoFilename,
              'rm -rf ' + deployDir,
              'mv ' + deploySide + ' ' + deployDir
            ].join(' && '))
          .then(function () {
            util.deployments(deploymentConfig)
              .then(function (deployments) {
                io.emit('deploy', {
                  deployments: deployments
                });
              });

            return {
              status: 'deployed'
            };
          });
      })
      .catch(function (error) {
        var message = error.message;

        if (_s.startsWith(error.message, 'ENOENT, stat')) {
          message = 'no build found for commit: ' + commit;
        }

        return {
          status: 'error',
          message: message
        };
      });
  },
  fetch: function fetch(repoPath) {
    return git('fetch --all', repoPath);
  },
  hashFor: function hashFor(name, repoPath) {
    return execAsync('git log --format=format:%H -1 ' + name, {cwd: repoPath})
      .then(function (output) {
        return output[0];
      })
      .catch(function(error) {
        if (_s.include(error.message, 'unknown revision or path not in the working tree')) {
          throw new Error("No commit or branch found for: " + name);
        }
        else {
          throw error.message;
        }
      });
  },
  status: function status(commit, repoPath, outDir) {
    var paths = this.buildPaths(commit, outDir);

    return util.hashFor(commit, repoPath)
      .then(function (validCommit) {
        return statAsync(paths.status)
          .then(function (stats) {
            return readFileAsync(paths.status)
              .then(function (data) {
                return {
                  status: data.toString().trim()
                };
              })
          })
          .catch(function(error) {
            return {
              status: 'not built'
            };
          });
      })
      .catch(function (error) {
        if (_s.startsWith(error.message, 'ENOENT, stat')) {
          return {
            status: 'not built'
          };
        }
        throw error;
      });
  }

};

module.exports = util;
