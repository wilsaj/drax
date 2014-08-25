'use strict';
var API = require('./api');

var express = require('express');

module.exports = function (staticDir, config) {
  var router = express.Router();

  router.use(express.static(staticDir));
  router.use('/api/v1/', API(config));

  router.get('/', function(req, res) {
    return res.render('index.html');
  });

  return router;
};
