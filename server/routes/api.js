'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var util = require('../util');
var _s  = require('underscore.string');
var _ = require('lodash');


// Open the repository in the current directory.

var router = function (config, io) {
  var buildCommand = config.get('buildCommand');
  var distDir = config.get('distDir');
  var outDir = config.get('outDir');
  var repoPath = config.get('repoPath');
  var repoUrl = config.get('repoUrl');

  var router = express.Router();

  // parse application/json and application/x-www-form-urlencoded
  router.use(bodyParser());

  router.route(/^\/build\/(.*)/)
    .get(function(req, res) {
      var name = req.params[0];
      var commit = util.hashFor(name, repoPath)
        .then(function (commit) {
          io.emit('build', {
            commit: commit,
            status: 'building'
          });

          util.build(commit, repoPath, buildCommand, distDir, outDir)
            .then(function () {
              io.emit('build', {
                commit: commit,
                status: 'built'
              });
            });

          res.json({
            status: 'building'
          });
        })
        .catch(function(error) {
          res.status(500).send(error.message);
        });
    });

  router.route('/branches')
    .get(function(req, res) {
      util.branches(repoPath)
        .then(function(branches) {
          res.json({
            'branches': branches
          });
        });
      });

  router.route('/clone')
    .get(function(req, res) {
      util.clone(repoUrl, repoPath)
        .then(function() {
          res.status(200).send('success');
        })
        .catch(function(error) {
          res.status(403).send(error.message);
        });
      });

  router.route('/commits')
    .get(function(req, res) {
      util.commits(repoPath, outDir)
        .then(function(commits) {
          res.json({
            'commits': commits
          });
        })
        .catch(function(error) {
          res.status(403).send(error.message);
        });
      });

  router.route('/deploy/:name/:commit')
    .get(function(req, res) {
      var name = req.params.name;
      var commit = req.params.commit;

      var deployment = _.find(config.get('deployments'), {"name": name});
      var deployDir = _.has(deployment, 'path') && deployment.path;

      if (!deployDir) {
        res.json({
          status: 'error',
          message: 'no deployment has been configured for: ' + name
        });
      } else {
        util.deploy(deployDir, commit, outDir, repoPath)
          .then(function(deploy) {
            res.json(deploy);
          })
          .catch(function(error) {
            res.status(403).send(error.message);
          });
      }
    });

  router.route('/status/:commit')
    .get(function(req, res) {
      var commit = req.params.commit;

      util.status(commit, repoPath, outDir)
        .then(function(status) {
          res.json(status);
        }).catch(function (error) {
          res.status(404).send(error.message);
        });
    });


  router.use('/preview', express.static(outDir));

  return router;
};


module.exports = router;
