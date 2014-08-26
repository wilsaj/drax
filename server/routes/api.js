'use strict';

var fs = require('fs');
var path = require('path');

var bodyParser = require('body-parser');
var express = require('express');
var util = require('../util');
var _s  = require('underscore.string');



// Open the repository in the current directory.

var router = function (config) {
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
          util.build(commit, repoPath, buildCommand, distDir, outDir)
            .then(function(commits) {
              res.send('built');
            })
            .catch(function(error) {
              console.log(error.message);
              res.send(500, error.message);
            });
        })
        .catch(function(error) {
          res.send(500, error.message);
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
          res.send(200, 'success');
        })
        .catch(function(error) {
          res.send(403, error.message);
        });
      });

  router.route('/commits')
    .get(function(req, res) {
      util.commits(repoPath)
        .then(function(commits) {
          res.json({
            'commits': commits
          });
        })
        .catch(function(error) {
          res.send(403, error.message);
        });
      });

  router.use('/preview', express.static(outDir));

  return router;
};


module.exports = router;
