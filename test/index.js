'use strict';

var request = require('supertest');
var should = require('should');

var app = require('../.dist/server')({'NODE_ENV': 'test'}).app;

describe('/', function () {
  it('GET should return something', function (done) {
    request(app)
      .get('/')
      .expect(200, done);
  });
});
