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

  router.route('/branches')
    .get(function(req, res) {
      util.branches(repoPath)
        .then(function(branches) {
          res.send(JSON.stringify({
            'branches': branches
          }));
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
  return router;
};


module.exports = router;
