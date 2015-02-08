var chai = require('chai');
chai.config.includeStack = true;
var should = chai.should();

var Deferred = require('JQDeferred');
var _ = require('lodash');
var fs = require('fs-extra');

var WWWrite = require('./../wwwrite');


var tree = [
    // 'file-as-page/',
    'articles/file-as-page/index.md',
    'articles/file-as-page/homercat.png',
    // 'file-as-page-excluded-from-listing/',
    'articles/file-as-page-excluded-from-listing/child-1.md',
    'articles/file-as-page-excluded-from-listing/index.md',
    // 'labs/',
    'articles/labs/labs-1.md',
    // 'nested/',
    'articles/nested/index.md',
    'articles/nested/example-1.md',
    'articles/nested/example-2.md',
    'articles/nested/style.scss',
    'articles/nested/assets/demo.js',
    // 'nested/nested/',
    'articles/nested/nested/index.md',
    'articles/nested/nested/example-1.md',
    'articles/nested/nested/example-2.md',
    'articles/nested/nested/style.scss',
    'articles/nested/nested/assets/demo.js',
    'articles/article-1.md',
    'articles/article-2.md',
    'articles/sticky.md',
    'articles/index.md',
    'index.md'
];


describe('wwwrite', function() {

    before(function() {
        this.wwwrite = new WWWrite({
            srcPath: 'test/fixtures/',
            outPath: 'test/fixtures/_build/',
            themePath: 'test/fixtures/_wwwrite/' // not user changeable (at the moment)
        });
    });

    after(function() {
        this.wwwrite.clean();
    });

    it('should read global config file (wwwrite.json)', function() {
        this.wwwrite.siteData.name.should.equal('mywwwrite');
    });

    describe('#parse', function() {
        before(function(done) {
            this.wwwrite.parse().done(function() {
                done();
            });
        });

        it('should define and set fileTree and dirTree attributes', function(done) {
            this.wwwrite.db.should.exist;
            this.wwwrite.db.find({isFile: true}, function(err, res) {
                res.should.have.length.above(0);
                this.wwwrite.db.find({isDir: true}, function(err, res) {
                    res.should.have.length.above(0);
                    done();
                }.bind(this));
            }.bind(this));
        });

        it('should exists data for each file', function(done) {
            var promises = _.map(tree, function(filePath) {
                var d = Deferred();

                this.wwwrite.db.find({isFile: true, 'path.rootSrcPath': filePath}, function(err, res) {
                    if (err) { return d.reject(); }
                    res.should.have.length(1);
                    d.resolve();
                }.bind(this));

                return d.promise();
            }, this);

            Deferred.when.apply(null, promises).done(function() {
                done();
            });
        });

        describe('#YAML front matter', function() {});
    });

    describe('#build', function() {
        before(function(done) {
            this.wwwrite.build().done(function() {
                done();
            });
        });

        it('should write ouput files', function(done) {
            var promises = _.map(tree, function(filePath) {
                var d = Deferred();

                this.wwwrite.db.findOne({isFile: true, 'path.rootSrcPath': filePath}, function(err, res) {
                    if (err) { return d.reject(); }
                    fs.existsSync(res.path.outFilePath).should.be.true;
                    d.resolve();
                }.bind(this));

                return d.promise();
            }, this);

            Deferred.when.apply(null, promises).done(function() {
                done();
            });
        });
    });
});