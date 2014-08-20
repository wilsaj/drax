'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var util = require('../util');



// Open the repository in the current directory.

var router = function (config) {
  var router = express.Router();

  // parse application/json and application/x-www-form-urlencoded
  router.use(bodyParser());

  router.route('/branches')
    .get(function(req, res) {

      var repoPath = config.get('repoPath') + '/.git';

      util.branches(repoPath)
        .then(function(branches) {
          res.send(JSON.stringify({
            'branches': branches
          }));
        });
      });

  return router;
};


module.exports = router;
