var _ = require('lodash');
var Deferred = require('JQDeferred');
var fileType = require('istextorbinary');
var path = require('path');
var fs = require('fs-extra');
var yfm = require('yfm');
var Datastore = require('nedb');
var nunjucks = require('nunjucks');
var findit = require('findit');
var moment = require('moment');

function Parser(wwwrite, options) {
    this.wwwrite = wwwrite;
    this.db = this.wwwrite.db;
    this.opts = options;
    this.init();
}

Parser.loaders = require('./loaders');
Parser.Extensions = require('./extensions');

_.extend(Parser.prototype, {
    init: function() {
        this.nunjucks = nunjucks.configure(path.join(this.opts.themeViewsPath));
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
        this.beforeParse();

        var finder = require('findit')(path.join(this.opts.srcPath));

        finder.on('directory', function(dir, stat, stop) {
            if (! this.isValidDir(dir) || ! this.isValidPath(dir)) {
                stop();
                return;
            }

            this.onDir(dir);
        }.bind(this));

        finder.on('file', function(file, stat) {
            if (! this.isValidFile(file) || ! this.isValidPath(file)) {
                return
            }
            this.onFile(file);
        }.bind(this));

        finder.on('end', function() {
            this.afterParse().done(d.resolve).fail(d.reject);
        }.bind(this));

        return d.promise();
    },

    beforeParse: function() {
        // this.clean();
    },

    afterParse: function() {
        return this.setDirsAsFiles().then(this.renderTextFiles.bind(this)).promise();
    },

    renderTextFiles: function() {
        var d = Deferred();

        this.db.find({isText: true}, function(err, pages) {
            var promises = _.map(pages, function(data) {
                var d2 = Deferred();
                this.getRenderedTextFile(data).done(function(outContent) {
                    this.db.update(
                        // query
                        {_id: data._id},
                        // update
                        {
                            $set: {
                                outContent: outContent
                            }
                        }, {}, function(err, res) {
                            if (err) { d2.reject(); return; }
                            d2.resolve();
                        }
                    );
                }.bind(this));

                return d2.promise();
            }, this);

            Deferred.when.apply(null, promises).then(d.resolve, d.reject);

        }.bind(this));

        return d.promise();
    },

    setDirsAsFiles: function() {
        var d = Deferred();
        this.db.find({isDir: true}, function(err, res) {
            if (err) {
                d.reject(err);
                return;
            }

            var exts = ['.html', '.md', '.markdown', '.txt'];
            var childPath;
            var promises = [];
            _.each(res, function(dir) {
                _.each(exts, function(ext) {
                    childPath = path.join(dir.path.srcPath, 'index' + ext);
                    if (fs.existsSync(childPath)) {
                        var d2 = Deferred();
                        promises.push(d2.promise());
                        this.db.findOne({'path.srcPath': childPath, isText: true}, function(err, child) {
                            if (err) { d2.reject(); return; }
                            // console.log(child.metadata, _.merge({}, child, dir).metadata);
                            this.db.update({_id: dir._id}, _.merge({}, child, dir), {}, function(err) {
                                if (err) { d2.reject(); return; }
                                d2.resolve();
                            });
                        }.bind(this));
                    }
                }, this)
            }, this);

            Deferred.when.apply(null, promises).then(d.resolve, d.reject);

        }.bind(this));

        return d.promise();
    },

    onFile: function(filePath) {
        var fileData = this.getFileData(filePath);
        this.db.insert(fileData)
    },

    onDir: function(dirPath) {
        var dirData = this.getDirData(dirPath);
        this.db.insert(dirData);
    },

    ensureRelPath: function(relativePath) {
        return relativePath ? relativePath + '/' : '';
    },

    getLoader: function(filePath) {
        var ext = path.extname(filePath).slice(1);
        var loaders = _.filter(_.omit(Parser.loaders, 'default'), function(loader) {
            return _.contains(loader.ext || [], ext);
        });

        var loader = loaders[0] || Parser.loaders.default;
        loader.defaults || (loader.defaults = {});
        return loader;
    },

    getDirData: function(dirPath) {
        return {
            isDir: true,
            isFile: false,
            path: {
                srcPath: dirPath
            }
        };
    },

    getFileData: function(filePath) {
        var loader = this.getLoader(filePath);

        var data = {};
        data.isText = fileType.isTextSync(filePath);
        data.isFile = true;
        data.isBinary = ! data.isText;
        data.isPartial = path.basename(filePath).indexOf('_') === 0;
        data.outputPage = loader.defaults.outputPage || false;
        data.metadata = {};
        data.site = this.wwwrite.siteData;

        data.path = {};
        data.path.srcPath = filePath;
        data.path.ext = path.extname(filePath);
        data.path.basename = path.basename(filePath);
        data.path.basenameNoExt = path.basename(filePath, data.path.ext);
        data.path.dirname = path.dirname(filePath);
        data.path.parentDirname = path.join(data.path.dirname, '..');
        data.path.relDirname = path.dirname(path.relative(this.opts.srcPath, filePath));

        data.path.outExt = loader.outExt ? '.' + loader.outExt : data.path.ext;
        data.path.outBasename = path.basename(filePath, data.path.ext) + data.path.outExt;
        data.path.outFilePath = path.join(this.opts.outPath, data.path.relDirname, data.path.outBasename);

        data.path.relRoot = this.ensureRelPath(
            path.relative(path.dirname(data.path.outFilePath), this.opts.outPath));
        data.path.relAssets = this.ensureRelPath(
            path.relative(path.dirname(data.path.outFilePath), this.opts.builtThemeAssetsPath))
        data.path.rootDestPath = path.join(data.path.relDirname, data.path.outBasename);
        data.path.rootSrcPath = path.join(data.path.relDirname, data.path.basename);

        if (data.isText) {
            data.outputPage && (data.metadata.template = 'post.html');
            _.merge(data, this.getTextFileData(filePath));
        }

        return data;
    },

    getDateObject: function(date) {
        var obj = { date: {} };
        var m = moment(date).utc();
        obj.date.origDate = date;
        obj.date.timestamp = m.format('x');
        obj.date.human = m.format(this.wwwrite.siteData.dateFormat || this.opts.dateFormat);
        return obj;
    },

    getTextFileData: function(filePath) {
        var fileContents = fs.readFileSync(filePath).toString();
        var fileData = yfm(fileContents); // context , content
        var metadata = fileData.context;

        if (metadata.date) {
            _.extend(metadata, this.getDateObject(metadata.date));
        }

        return {
            metadata: metadata,
            fileContents: fileContents,
            content: fileData.content
        };
    },

    registerExtensions: function(env) {
        _.each(Parser.Extensions, function(extension) {
            extension.register(env, this.wwwrite);
        }, this);
    },


    getRenderedTextFile: function(data) {
        var d = Deferred();
        var loader = this.getLoader(data.path.srcPath);
        var env = new nunjucks.Environment([
            new nunjucks.FileSystemLoader(data.path.dirname),
            new nunjucks.FileSystemLoader(path.join(this.opts.themeViewsPath))
        ]);
        this.registerExtensions(env);
        var tpl = nunjucks.compile(data.content, env, data.path.srcPath);
        tpl.render(data, function(err, res) {
            d.resolve(loader.transform(res));
        });

        return d.promise();
    }
});


module.exports = Parser;