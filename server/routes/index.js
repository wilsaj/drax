'use strict';
var API = require('./api');

var express = require('express');

module.exports = function (staticDir, config, io) {
  var router = express.Router();

  router.use(express.static(staticDir));
  router.use('/api/v1/', API(config, io));

  router.get('/', function(req, res) {
    return res.sendfile('server/views/index.html');
  });

  return router;
};
