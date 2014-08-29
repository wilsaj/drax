'use strict';
var express = require('express');
var http = require('http');

var Config = require('./config');
var Routes = require('./routes');
var util = require('./util');

var Server = function (options) {
  var app = express();
  var config = Config(options);

  var server = require('http').Server(app);
  var io = require('socket.io')(server);

  // set up routes, mapping the .dist/client dir to be served as static content
  var staticDir = './client';
  app.use('/', Routes(staticDir, config, io));
  app.set('views', './server/views');


  return {
    app: app,
    start: function(port, callback) {
      callback = callback || function () {};
      port = port || config.get('port');

      util.clearPartials(config.get('outDir'))
        .then(function () {
          server.listen(port, function () {
            console.log('Express server listening on port %d in %s mode', port, app.get('env'));
            callback();
          });
        });

    },
    stop: function(callback) {
      callback = callback || function () {};
      server.close(callback);
    }
  };
};

if (require.main === module) {
  Server().start();
}

module.exports = Server;
