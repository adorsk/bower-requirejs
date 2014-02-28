'use strict';
var path = require('path');
var fs = require('fs');
var bower = require('bower');
var file = require('file-utils');
var requirejs = require('requirejs/bin/r.js');
var _ = require('lodash');
var assign = require('object-assign');
var chalk = require('chalk');
var success = chalk.green;
var danger = chalk.black.bgRed;
var parse = require('./parse');

/**
 * Convert bower dependencies into paths for
 * RequireJS config file
 */
module.exports = function (opts, done) {
  opts = opts || {};

  var bowerOpts = _.extend({offline: true}, opts.bowerOpts);

  var configPath = opts.config;
  if (!configPath) {
    throw new Error('--config option is required');
  }
  var configDir = path.dirname(configPath);
  var exclude = opts.exclude || [];
  var baseUrl = opts.baseUrl || configDir;

  // Grab the config file, or create one if it doesn't exist
  var config;

  if (file.exists(configPath)) {
    config = fs.readFileSync(String(configPath), 'utf8');
  } else {
    config = fs.readFileSync(path.join(__dirname, '../templates/config.js'), 'utf8');
  }


  function run() {
    bower.commands.list({}, bowerOpts)
      .on('end', function (dependencyGraph) {
        if (dependencyGraph) {
          writeConfig(buildConfig(dependencyGraph, opts));
        }
      })
      .on('error', function (err) {
        console.error(danger('ERR'), process.argv.slice(2).join(' '), '\n');
        console.error(opts.debug ? err.stack : err.message);
        process.exit(err.code || 1);
      });
  }

  /**
   * Turn bower dependencies into requirejs config object.
   */
  function buildConfig(dependencyGraph, opts) {
    opts = opts || {};

    var dependencies = {};
    // Recursively register dependencies if transitive option is specified.
    if (opts.transitive) {
      var registerTransitiveDependencies = function (node) {
        if (node.dependencies) {
          _.forOwn(node.dependencies, function (dep, name) {
            if (! _.has(dependencies, name)) {
              dependencies[name] = dep;
              registerTransitiveDependencies(dep);
            }
          });
        }
      };
      registerTransitiveDependencies(dependencyGraph);
    } else {
      // Otherwise just use top-level dependencies.
      dependencies = dependencyGraph.dependencies;
    }

    var config = {
      paths: {},
      packages: []
    };

    _.forOwn(dependencies, function (dep, name) {
      if (exclude.indexOf(name) !== -1) {
        return;
      }

      var configElement = parse(dep, name, baseUrl);
      if (configElement) {
        if (configElement.type === 'paths') {
          assign(config.paths, configElement.paths);
        } else if (configElement.type === 'package') {
          config.packages.push(configElement.package);
        }
      }
    });

    return config;
  }

  /**
   * Write all dependencies to rjs config file
   */
  function writeConfig(rjsConfigFromBower) {
    var rjsConfig;
    requirejs.tools.useLib(function (require) {
      rjsConfig = require('transform').modifyConfig(config, function (config) {

        // If the original config defines paths, add the
        // bower component paths to it; otherwise, add a
        // paths map with the bower components.
        // @TODO: CHECK FOR CONFLICTS WITH EXISTING PATHS
        if (rjsConfigFromBower.paths) {
          if (config.paths) {
            assign(config.paths, rjsConfigFromBower.paths);
          } else {
            config.paths = rjsConfigFromBower.paths;
          }
        }

        // If the original config defines packages, add the
        // bower packages, otherwise create new packages definition.
        // @TODO: CHECK FOR CONFLICTS WITH EXISTING PACKAGES
        if (rjsConfigFromBower.packages) {
          if (config.packages) {
            _.each(rjsConfigFromBower.packages, function (bowerPackage) {
              config.packages.push(bowerPackage);
            });
          } else {
            config.packages = rjsConfigFromBower.packages;
          }
        }

        return config;
      });

      fs.writeFileSync(configPath, rjsConfig, 'utf-8');
      console.log(success('Updated RequireJS config with installed Bower components'));

      if (!done) {
        done = function () {};
      }
      done();
    });
  }

  run();
};
