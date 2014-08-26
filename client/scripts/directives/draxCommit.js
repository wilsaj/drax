var draxCommit = function() {
  'use strict';

  return {
    restrict: 'A',
    template:
      '<div class="commit">' +
        '<h3>commit</h3>' +
        '<p>{{ commit.hash }}</p>' +
        '<p>{{ commit.subject }}</p>' +
        '<p>{{ commit.body }}</p>' +
      '</div>'
  };
};
