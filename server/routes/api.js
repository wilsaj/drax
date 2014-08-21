'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var util = require('../util');



// Open the repository in the current directory.

var router = function (config) {
  var repoPath = config.get('repoPath');
  var repoUrl = config.get('repoUrl');

  var router = express.Router();

  // parse application/json and application/x-www-form-urlencoded
  router.use(bodyParser());

  router.route('/build/:branch')
    .get(function(req, res) {
      var branch = req.params.branch;
      util.build(branch, repoPath)
        .then(function(branches) {
          res.send('built');
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

  return router;
};


module.exports = router;
