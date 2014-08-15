'use strict';
var path = require('path');

var nconf = require('nconf');

module.exports = function (options) {
  nconf.overrides(options);

  nconf.env(['debug', 'NODE_ENV']);

  process.env.NODE_ENV = nconf.get('NODE_ENV') || 'production';

  nconf.file('secrets', {
    type: 'file',
    file: path.join(__dirname, 'secrets',  process.env.NODE_ENV + '.json')
  });

  nconf.file('default', {
    type: 'file',
    file: path.join(__dirname, 'defaults.json')
  });

  return nconf;
};
