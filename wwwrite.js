#!/usr/bin/env node
var _ = require('lodash');
var Deferred = require('JQDeferred');
var fileType = require('istextorbinary');
var path = require('path');
var fs = require('fs-extra');
var yfm = require('yfm');
var Datastore = require('nedb');
var nunjucks = require('nunjucks');


function WWWrite(opts) {
	this.opts = _.extend({}, WWWrite.defaults, opts);

	this.opts.srcPath = path.resolve(this.opts.srcPath);
	this.opts.outPath = path.join(this.opts.outPath);

	this.opts.themePath = path.join(this.opts.themePath);
	this.opts.themeViewsPath = path.join(this.opts.themePath, 'views/');
	this.opts.builtThemePath = path.join(this.opts.outPath, '_wwwrite/');
	this.opts.builtThemeAssetsPath = path.join(this.opts.builtThemePath, 'assets/');

	var configPath = path.join(this.opts.srcPath, 'wwwrite.json');
	this.siteData = (fs.existsSync(configPath) &&
	    JSON.parse(fs.readFileSync(configPath))) || {};

	this.init();
}


WWWrite.defaults = {
	srcPath: './',
	outPath: './_build/',
	themePath: './_wwwrite/',
	excludeDirs: ['_wwwrite', '.git', 'node_modules', 'bower_components', '_build'],
	excudeFiles: ['.DS_Store', 'wwwrite.json'],
	excludePaths: [],
	dateFormat: 'D MMM YYYY'
}

WWWrite.Parser = require('./lib/parser');


_.extend(WWWrite.prototype, {
	init: function() {
		this.db = new Datastore();
		this.nunjucks = nunjucks.configure(this.opts.themeViewsPath);
		this.parser = new WWWrite.Parser(this, this.opts);
	},

	parse: function() {
		return this.parser.parse();
	},

	build: function() {
		return this.output();
	},

	run: function() {
		return this.parse().then(this.build.bind(this)).promise();
	},

	output: function() {
		var d = Deferred();

		this.clean();
		this.buildTheme();

		var outputFileSync = function(fileData, content) {
			fs.outputFileSync(fileData.path.outFilePath, content);
			console.log('Generated file on %s', fileData.path.rootDestPath);
		}

		this.db.find({isFile: true}, function(err, res) {
			if (err) { return d.reject(); }

			this.parser.registerExtensions(this.nunjucks);

			var promises = [];
			_.each(res, function(fileData) {
				var outContent = fileData.outContent;
				if (fileData.metadata.template) {
					var d2 = Deferred();
					promises.push(d2.promise());

					this.nunjucks.render(fileData.metadata.template, fileData, function(err, res) {
						if (err) { return d2.reject(); }
						outputFileSync(fileData, res);
						d2.resolve();
					});
				} else {
					outputFileSync(fileData, outContent);
				}
			}, this);

			Deferred.when.apply(null, promises).then(d.resolve, d.reject);
		}.bind(this));

		return d.promise();
	},

	buildTheme: function() {
		fs.copySync(this.opts.themePath, this.opts.builtThemePath);

		fs.removeSync(path.join(this.opts.builtThemePath, 'views'));
		fs.mkdirsSync(path.join(this.opts.builtThemeAssetsPath, 'stylesheets/'));
		require('node-sass').renderFile({
			file: path.join(this.opts.builtThemeAssetsPath, 'scss/all.scss'),
			outFile: path.join(this.opts.builtThemeAssetsPath, 'stylesheets/all.css'),
			success: function() {
				fs.removeSync(path.join(this.opts.builtThemeAssetsPath, 'scss'));
			}.bind(this),
			error: function(error) {
		        console.log('Error compiling .scss files of the theme', error);
		    }.bind(this)
		});
	},

	clean: function() {
		fs.removeSync(this.opts.outPath);
		return this;
	}
});



module.exports = WWWrite;