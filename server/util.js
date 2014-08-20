'use strict';

var Promise = require('bluebird');
var git = require('nodegit');
var _s  = require('underscore.string');

var openRepo = Promise.promisify(git.Repo.open);
Promise.promisifyAll(git.Repo.prototype);

var util = {
  branches: function branches(repoPath) {
    return openRepo(repoPath)
      .then(function(repository) {
        return repository.getReferencesAsync(git.Reference.Type.Oid)
          .then(function(referenceNames) {
            return referenceNames
              .filter(function(referenceName) {
                return _s.startsWith(referenceName, "refs/heads");
              })
              .map(function(referenceName) {
                return referenceName.substr(11);
              });
          });
      })
      .catch(function(error) {
        console.log("Error: " + error.message);
      });
  }
};

module.exports = util;
