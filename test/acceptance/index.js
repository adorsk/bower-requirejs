/* global describe:true, it:true */

'use strict';
var fs = require('fs');
var should = require('should');
var durableJsonLint = require('durable-json-lint');
var bower = require('bower');
var path = require('path');
var os = require('os');

// extract the config object as a string from the actual and expected files.
// then turn the string into json so we can deeply compare the objects.
// we do this because bower does not always create the paths object's keys
// in the same order. so a pure string to string comparison will break.
var jsonify = function (str) {
  var dirtyJson = str.slice(str.indexOf('{'), str.lastIndexOf('}') + 1);
  var cleanJson = durableJsonLint(dirtyJson).json;

  return JSON.parse(cleanJson);
};

describe('index', function () {

  describe('config', function () {
    it('should return the expected result', function (done) {
      var opts = { config: 'tmp/config.js', exclude: ['underscore'] };
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync('tmp/config.js', 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/config-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });
  });

  describe('global-config', function () {
    it('should return the expected result', function (done) {
      var opts = { config: 'tmp/global-config.js', exclude: ['underscore'] };
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync('tmp/global-config.js', 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/global-config-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });
  });

  describe('baseurl', function () {
    it('should return the expected result', function (done) {
      var opts = { config: 'tmp/baseurl.js', exclude: ['underscore'], baseUrl: './' };
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync('tmp/baseurl.js', 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/baseurl-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });
  });

  describe('pathless-config', function () {
    it('should return the expected result', function (done) {
      var opts = { config: 'tmp/pathless-config.js', exclude: ['underscore'] };
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync('tmp/pathless-config.js', 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/pathless-config-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });
  });

  describe('generated-config', function () {
    it('should return the expected result', function (done) {
      var opts = { config: 'tmp/generated-config.js', exclude: ['underscore'] };
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync('tmp/generated-config.js', 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/generated-config-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });
  });

  describe('transitive dependencies', function(){
    var bowerOpts;
    var tmpDir;
    var configFile;

    // Setup temporary bower components.
    before(function(done){
      tmpDir = path.join(os.tmpdir(), 'transitiveTest.' + process.pid);
      fs.mkdirSync(tmpDir);

      bowerOpts = { cwd: tmpDir };
      configFile = path.join(tmpDir, 'config.js');

      bower.commands.install(['marionette#1.6.2'], {}, bowerOpts)
      .on('end', function(){done()});
    });

    // Clear configFile before each test.
    beforeEach(function(){
      if (fs.existsSync(configFile)){
        fs.unlinkSync(configFile);
      }
    });

    it('should include transitive dependencies if transitive option is true', function(done){
      var opts = {transitive: true, config: configFile, bowerOpts: bowerOpts};
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync(configFile, 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/transitive-true-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });

    it('should not include transitive dependencies if transitive option is false', function(done){
      var opts = {transitive: false, config: configFile, bowerOpts: bowerOpts};
      require('../../lib')(opts, function () {
        var actual = jsonify(fs.readFileSync(configFile, 'utf8'));
        var expected = jsonify(fs.readFileSync('test/acceptance/fixtures/transitive-false-expected.js', 'utf8'));
        actual.should.eql(expected);
        done();
      });
    });
  });
});
