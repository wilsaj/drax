'use strict';
var express = require('express');

var Config = require('./config');

var Server = function (options) {
  var app = express();
  var config = Config(options);


  app.get('/', function(req, res){
    res.send('hi');
  });

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