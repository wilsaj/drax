'use strict';
var consolidate = require('consolidate');
var express = require('express');

var Config = require('./config');
var Routes = require('./routes');

var Server = function (options) {
  var app = express();
  var config = Config(options);

  // set up routes, mapping the .dist/client dir to be served as static content
  var staticDir = __dirname + '/client';
  app.use('/', Routes(staticDir, config));
  app.engine('html', consolidate.swig);
  app.set('views', './server/views');

  return {
    app: app,
    start: function() {
      var port = config.get('port');

      app.listen(port, function () {
        console.log('Express server listening on port %d in %s mode', port, app.get('env'));
      });
    }
  };
};

if (require.main === module) {
  Server().start();
}

module.exports = Server;
