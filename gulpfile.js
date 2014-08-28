'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var rimraf = require('gulp-rimraf');
var runSequence = require('run-sequence');
var sass = require('gulp-ruby-sass');
var templateCache = require('gulp-angular-templatecache');
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
dirs.angularTemplates = dirs.client + '/scripts/templates';
dirs.tmpUseref = dirs.tmp + '/useref';

var paths = {
  client: dirs.client + '/**/*',
  server: dirs.server + '/**/*',
  scss: dirs.scss + '/**/*.scss',
  templates: dirs.templates + '/**/*',
  angularTemplates: dirs.angularTemplates + '/**/*.html',
  tmpUseref: dirs.tmpUseref + '/*'
};

gulp.task('default', ['dist']);

gulp.task('dev', ['dist', 'watch']);

gulp.task('watch', function () {
  gulp.watch([paths.client, paths.templates], ['dist-client']);
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
      '!' + paths.angularTemplates,
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

gulp.task('dist-useref', ['dist-useref-assets', 'dist-useref-templates']);

gulp.task('dist-angular-template-cache', function () {
    gulp.src(paths.angularTemplates)
        .pipe(templateCache({module: 'draxApp'}))
        .pipe(gulp.dest(dirs.dist + '/' + dirs.client + '/scripts'));
});


gulp.task('dist-useref-tmp', ['dist-angular-template-cache', 'dist-other'],function() {
  var assets = useref.assets({
    searchPath: dirs.dist + '/' + dirs.client
  });

  return gulp.src(paths.templates)
      .pipe(assets)
      .pipe(assets.restore())
      .pipe(useref())
      .pipe(gulp.dest(dirs.tmpUseref));
});

gulp.task('dist-useref-assets', ['dist-useref-tmp'], function() {
  return gulp.src([dirs.tmpUseref + '/**/*', '!' + dirs.tmpUseref + '/*'])
      .pipe(gulp.dest(dirs.dist + '/' + dirs.client));
});

gulp.task('dist-useref-templates', ['dist-useref-tmp'], function() {
  return gulp.src(dirs.tmpUseref + '/*')
      .pipe(gulp.dest(dirs.dist + '/' + dirs.templates));
});

gulp.task('dist-server', function () {
  return gulp.src([paths.server, '!' + paths.templates])
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
