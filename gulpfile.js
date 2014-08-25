'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var rimraf = require('gulp-rimraf');
var runSequence = require('run-sequence');
var sass = require('gulp-ruby-sass');
var useref = require('gulp-useref');

var dirs = {
  client: 'client',
  dist: '.dist',
  sassCache: '.sassCache',
  server: 'server',
  test: 'test',
  tmp: '.tmp'
};

dirs.scss = dirs.client + '/scss';
dirs.templates = dirs.server + '/views';
dirs.tmpUseref = dirs.tmp + '/useref';

var paths = {
  client: dirs.client + '/**/*',
  server: dirs.server + '/**/*',
  scss: dirs.scss + '/**/*.scss',
  templates: dirs.templates + '/**/*'
};

gulp.task('default', ['dist']);

gulp.task('dev', ['dist', 'watch']);

gulp.task('watch', function () {
  gulp.watch(paths.client, ['dist-client']);
  gulp.watch(paths.server, ['dist-server']);

  console.log('Watches are active for continuously disting dev files.');
  console.log('  To start dev server: `npm run start` in a separate shell');
  console.log('  In debug mode: `npm run debug` and `node-inspector` in two separate shells');
});

gulp.task('dist', ['dist-server', 'dist-client']);
gulp.task('dist-client', ['dist-other', 'dist-scss', 'dist-useref']);

gulp.task('dist-other', function () {
  var otherPaths = [
      '!' + paths.scss,
      paths.client
  ];

  return gulp.src(otherPaths)
    .pipe(gulp.dest(dirs.dist + '/' + dirs.client));
});

gulp.task('dist-scss', function () {
  return gulp.src(paths.scss)
    .pipe(sass())
    .pipe(gulp.dest(dirs.dist + '/' + dirs.client + '/css'));
});

gulp.task('dist-useref', ['dist-useref-templates']);

gulp.task('dist-useref-tmp', function() {
  var assets = useref.assets({
        searchPath: dirs.client
      });

  return gulp.src(paths.templates)
      .pipe(assets)
      .pipe(assets.restore())
      .pipe(useref())
      .pipe(gulp.dest(dirs.tmpUseref));
});


gulp.task('dist-useref-templates', ['dist-useref-tmp'], function() {
  return gulp.src(dirs.tmpUseref + '/*')
      .pipe(gulp.dest(dirs.dist + '/' + dirs.templates));
});

gulp.task('dist-server', function () {
  return gulp.src(paths.server)
    .pipe(gulp.dest(dirs.dist + '/' + dirs.server));
});

gulp.task('clean', ['clean-dist', 'clean-sass-cache']);

gulp.task('clean-dist', function() {
  return gulp.src(dirs.dist)
    .pipe(rimraf());
});

gulp.task('clean-sass-cache', function() {
  return gulp.src(dirs.sassCache)
    .pipe(rimraf());
});


gulp.task('fresh-dist', function (callback) {
  runSequence(
    'clean',
    'dist',
    callback);
});


gulp.task('test', ['fresh-dist'], function() {
  return gulp.src([dirs.test + '/**/*.js'])
    .pipe(mocha());
});
