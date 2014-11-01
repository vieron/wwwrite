#!/usr/bin/env node
var _ = require('lodash');
var path = require('path');
var fs = require('fs-extra');
var Deferred = require('JQDeferred');
var nunjucks = require('nunjucks');
var yfm = require('yfm');
var fileType = require('istextorbinary');
var moment = require('moment');

// nunjucks extensions
var nunjucks_extensions = {
	link_to: require('./extensions/link_to')
}


var u = {
	ensureRelativePath: function(relativePath) {
        return relativePath ? relativePath + '/' : '';
    }
}


function WWWrite(opts) {
	this.opts = _.extend({}, WWWrite.defaults, opts);
	this.init();
}

WWWrite.defaults = {
	writingsPath: './',
	buildPath: '_build/',
	themePath: '_wwwrite/', // not user changeable (at the moment)
	excludeDirs: ['_wwwrite', '.git', 'node_modules'],
	excudeFiles: ['.DS_Store', 'wwwrite.json'],
	excludePaths: ['run.js'],
	dateFormat: 'D MMM YYYY'
}

WWWrite.t = {};
WWWrite.transformers = {
	'default': {
		setup: function() {},
 		transform: function(fileContents) {
			return fileContents.toString();
		}
	}
};
_.extend(WWWrite.transformers, {
	'.html': {
		setup: function() {},
		transform: WWWrite.transformers.default.transform,
		defaults: {
			isRenderable: true // content can be rendered in a browser
		}
	},
	'.md|.markdown': {
		setup: function() {
			WWWrite.t.marked = require('marked');
			WWWrite.t.hljs = require('highlight.js');

			WWWrite.t.hljs.configure({classPrefix: ''});
			var renderer = new WWWrite.t.marked.Renderer();
			renderer.code = function(code, language){
				language || (language = '');
				var code = language ? WWWrite.t.hljs.highlight(language, code).value :
					WWWrite.t.hljs.highlightAuto(code).value;

			  	return '<pre class="hljs"><code class="' + language + '">' +
			    			code +
			    		'</code></pre>';
			};

			WWWrite.t.marked.setOptions({
			  	langPrefix: '',
			  	renderer: renderer
			});
		},
		transform: function(fileContents) {
			return WWWrite.t.marked(fileContents.toString());
		},
		defaults: {
			path: {
				outExt: '.html',
			},
			page: {
				template: 'post.html',
			},
			isRenderable: true
		}
	},

	'.scss': {
		setup: function() {
			WWWrite.t.sass = require('node-sass');
		},
		transform: function(fileContents) {
			return WWWrite.t.sass.renderSync({
					data: fileContents.toString()
				});
		},
		defaults: {
			path: {
				outExt: '.css'
			}
		}
	}
});



_.extend(WWWrite.prototype, {
	init: function() {
		this.writingsPath = path.resolve(this.opts.writingsPath);
		this.viewsPath = path.join(this.opts.themePath, 'views/');
		this.buildPath = path.join(this.opts.buildPath);
		this.builtThemePath = path.join(this.opts.buildPath, '_wwwrite/');
		this.builtThemeAssetsPath = path.join(this.builtThemePath, 'assets/');
		this.siteData = (fs.existsSync('wwwrite.json') &&
			JSON.parse(fs.readFileSync('wwwrite.json'))) || {};

		this.setup();
	},
	setup: function() {
		_.invoke(WWWrite.transformers, 'setup');
		this.nunjucks = nunjucks.configure(path.join(this.viewsPath));
	},

	registerExtensions: function(env) {
		_.each(nunjucks_extensions, function(extension) {
			extension.register(env, this);
		}, this);
	},

	isValidPath: function(path) {
		return ! _.contains(this.opts.excludePaths, path);
	},

	isValidDir: function(dirPath) {
		var base = path.basename(dirPath);
		return ! _.contains(this.opts.excludeDirs, base);
	},

	isValidFile: function(filePath) {
		var base = path.basename(filePath);
		return ! _.contains(this.opts.excudeFiles, base);
	},

	parse: function() {
		var d = Deferred();
		this.clean();
		this.fileTree = [];
		this.dirTree = [];

		var finder = require('findit')(path.join(this.opts.writingsPath));

		finder.on('directory', function(dir, stat, stop) {
		    if (! this.isValidDir(dir) || ! this.isValidPath(dir)) {
		    	stop();
		    	return;
		    }
		}.bind(this));

		finder.on('file', function(file, stat) {
			if (! this.isValidFile(file) || ! this.isValidPath(file)) {
				return
			}
		    this.transformFile(file);
		}.bind(this));

		finder.on('end', function() {
			this.postProcessFileData();
			d.resolve(this);
		}.bind(this));

		return d.promise();
	},

	run: function(callback) {
		var d = Deferred();

		this.parse().done(function() {
			this.build();
			d.resolve(this);
		}.bind(this));

		return d.promise();
	},

	getTransformer: function(fileExt) {
		var validExts = _.keys(WWWrite.transformers);
		var transformerKey = _(validExts).filter(function(key) {
			var extensions = key.split('|');
			return _.contains(extensions, fileExt);
		}).value()[0];

		return WWWrite.transformers[transformerKey];
	},

	transformFile: function(filePath) {
		var fileData = this.getFileData(filePath);

		if (fileData.page.draft) { return; }

		this.fileTree.push(fileData);
	},

	getDirData: function(dirPath) {
		var data = {
			page: {
				dirname: dirPath
			}
		}
	},

	getFileData: function(filePath) {
		var isText = fileType.isTextSync(filePath);
		var fileExt = path.extname(filePath);
		var transformer = (this.getTransformer(fileExt) || WWWrite.transformers.default);
		var transformerDefaults = transformer.defaults || {};

		// paths
		var pageBasename = path.basename(filePath);
		var pageBasenameNoExt = path.basename(filePath, fileExt);
		var pageDirname = path.dirname(filePath);
		var pageRelDirPath = path.dirname(path.relative(this.opts.writingsPath, filePath));
		var defaultDestExt = (transformerDefaults.path && transformerDefaults.path.outExt) || fileExt;
		var destBasename = path.basename(filePath, fileExt) + defaultDestExt;
		var destFilePath = path.join(this.buildPath, pageRelDirPath, destBasename);

		var relRoot = u.ensureRelativePath(path.relative(path.dirname(destFilePath), this.buildPath));
		var rootDestPath = path.join(pageRelDirPath, destBasename);

		// file data (passed to template)
		var data = _.merge({}, transformerDefaults, {
			site: this.siteData,
			path: {
				origin: filePath,
				dest: destFilePath,
				dirname: pageDirname,
				ext: fileExt,
				basename: pageBasename,
				basenameNoExt: pageBasenameNoExt,
				destBasename: destBasename,
				rootDest: rootDestPath,
				relAssets: u.ensureRelativePath(
					path.relative(path.dirname(destFilePath), this.builtThemeAssetsPath)),
				relRoot: relRoot
			},
			page: {
				listing: true,
				isPartial: path.basename(filePath)[0] === '_',
				comments: true,
				url: path.join(this.siteData.url, rootDestPath)
			},
			isInRoot: relRoot === '',
			transformer: transformer,
			isBinary: ! isText,
			isRenderable: transformerDefaults.isRenderable || false,
		});

		if (isText) {
			var fileContents = fs.readFileSync(filePath).toString();
			var fileData = yfm(fileContents); // context , content
			_.extend(data.page, fileData.context || {});
			_.extend(data, {
				fileContents: fileContents,
				content: fileData.content || ''
			});

			if (data.page.date) {
				var origDate = data.page.date;
				data.page.origDate = origDate;
				data.page.momentDate = moment(origDate).utc();
				data.page.isoDate = data.page.momentDate.format();
				data.page.date = data.page.momentDate.format(this.opts.dateFormat);
			}
		}

		// parent folder
		if (pageBasenameNoExt === 'index') {
			var dirData = _.cloneDeep(data);
			dirData.dir = {
				dirname: path.dirname(pageDirname),
				destBasename: path.join(path.basename(pageDirname), dirData.path.destBasename)
			};
			dirData.isInRoot = data.isInRoot || path.relative(this.opts.writingsPath, dirData.dir.dirname) === '';

			this.dirTree.push(dirData);
		}

		return data;
	},

	postProcessFileData: function() {
		_.each(this.fileTree, function(data) {
			data.page.css = (data.page.css || '').split(',');
			data.page.js = (data.page.js || '').split(',');

			data.fs = {};
			data.fs.siblings = this.getFileSiblings(data);
		}, this);

		_.each(this.dirTree, function(data) {
			data.fs = {};
			data.fs.childs = this.getChilds(data);
		}, this);
	},

	clean: function() {
		fs.removeSync(this.buildPath);
		return this;
	},

	build: function() {
		this.clean();
		this.registerExtensions(this.nunjucks);
		_.each(this.fileTree, this.outputFile, this);
		this.buildFeed();
		this.buildTheme();
		return this;
	},

	getFileSiblings: function(currentFileData, selfInclude) {
		var files = _(this.fileTree).filter(function(fileData) {
				return (! fileData.page.isPartial &&
						fileData.isRenderable &&
						currentFileData.path.dirname === fileData.path.dirname &&
					    currentFileData.path.origin !== fileData.path.origin);
			}).value();

		var dirs = _(this.dirTree).filter(function(dirData) {
				return (dirData.page.listing !== false &&
						currentFileData.path.dirname === dirData.dir.dirname &&
						currentFileData.path.origin !== dirData.path.origin);
			}).value();

		if (selfInclude) {
			files.push(currentFileData);
		}

		return this.sortTree(dirs.concat(files));
	},

	getChilds: function(currentDirData) {
		var files = _(this.fileTree).filter(function(fileData) {
				return (! fileData.page.isPartial &&
						fileData.isRenderable &&
						currentDirData.path.dirname === fileData.path.dirname);
			}).value();

		var dirs = _(this.dirTree).filter(function(dirData) {
				return (currentDirData.path.dirname === dirData.dir.dirname);
			}).value();

		return this.sortTree(dirs.concat(files));
	},

	getRecents: function() {
		var items = this.fileTree.concat(this.dirTree);

		return _(items).filter(function(item) {
			return !item.page.isPartial &&
					item.isRenderable &&
					item.page.momentDate;
		}).sortBy(function(item) {
			return item.page.momentDate;
		}).reverse().value();
	},

	sortTree: function(tree) {
		return tree.sort(function(a, b) {
			if (b.page.sticky && b.page.sticky < a.page.sticky) {
				return 1;
			}

			if (b.page.momentDate > a.page.momentDate) {
				return 1;
			}

			return -1;
		});
	},

	outputFile: function(fileData) {
		if (fileData.isBinary) {
			fs.copySync(fileData.path.origin, fileData.path.dest);
			return;
		}

		var env = new nunjucks.Environment([
			new nunjucks.FileSystemLoader(fileData.path.dirname),
            new nunjucks.FileSystemLoader(path.join(this.viewsPath))]);
		this.registerExtensions(env);
		var tmpl = nunjucks.compile(fileData.content, env, fileData.path.origin);

		var fileRendered = tmpl.render(fileData);
		var fileTransformed = fileData.transformer.transform(fileRendered);
		fileData.content = fileTransformed;

		if (fileData.page.template) {
			fileTransformed = this.nunjucks.render(fileData.page.template, fileData);
		}

		fs.outputFileSync(fileData.path.dest, fileTransformed);
		console.log('File generated in:', fileData.path.dest);
	},

	buildTheme: function() {
		fs.copySync(this.opts.themePath, this.builtThemePath);

		fs.removeSync(path.join(this.builtThemePath, 'views'));
		fs.mkdirsSync(path.join(this.builtThemeAssetsPath, 'stylesheets/'));
		require('node-sass').renderFile({
			file: path.join(this.builtThemeAssetsPath, 'scss/all.scss'),
			outFile: path.join(this.builtThemeAssetsPath, 'stylesheets/all.css'),
			success: function() {
				fs.removeSync(path.join(this.builtThemeAssetsPath, 'scss'));
			}.bind(this),
			error: function(error) {
		        console.log('Error compiling .scss files of the theme', error);
		    }.bind(this)
		});
	},

	buildFeed: function() {
		var siteData = _.extend(this.siteData, {
			date: moment().utc().format()
		});

		var contents = this.nunjucks.render('feed.xml', {
			site: siteData,
			items: this.getRecents()
		});

		fs.outputFileSync(path.join(this.buildPath, 'feed.xml'), contents);
	}
});

module.exports = WWWrite;