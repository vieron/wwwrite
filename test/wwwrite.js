var chai = require('chai');
chai.config.includeStack = true;
var should = chai.should();

var _ = require('lodash');
var fs = require('fs-extra');

var WWWrite = require('./../wwwrite');


var tree = [
    // 'file-as-page/',
    'file-as-page/index.md',
    'file-as-page/homercat.png',
    // 'file-as-page-excluded-from-listing/',
    'file-as-page-excluded-from-listing/child-1.md',
    'file-as-page-excluded-from-listing/index.md',
    // 'labs/',
    'labs/labs-1.md',
    // 'nested/',
    'nested/index.md',
    'nested/example-1.md',
    'nested/example-2.md',
    'nested/style.scss',
    'nested/assets/demo.js',
    // 'nested/nested/',
    'nested/nested/index.md',
    'nested/nested/example-1.md',
    'nested/nested/example-2.md',
    'nested/nested/style.scss',
    'nested/nested/assets/demo.js',
    'article-1.md',
    'article-2.md',
    'sticky.md',
    'index.md'
];

_.each(tree, function(item, i) {
    tree[i] = 'test/fixtures/' + item;
});


describe('wwwrite', function() {
    before(function() {
        this.wwwrite = new WWWrite({
            writingsPath: 'test/fixtures/',
            buildPath: 'test/fixtures/_build/',
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

        it('should define and set fileTree and dirTree attributes', function() {
            this.wwwrite.fileTree.should.exist;
            this.wwwrite.fileTree.should.have.length.above(0);
            this.wwwrite.dirTree.should.exist;
            this.wwwrite.dirTree.should.have.length.above(0);
        });

        it('should exists data for each file', function() {
            _.each(tree, function(filePath) {
                var files = this.wwwrite.fileTree.filter(function(item) {
                    return item.path.origin === filePath;
                });
                files.should.have.length(1);
            }, this);
        });

        describe('#YAML front matter', function() {});
    });

    describe('#build', function() {
        before(function() {
            this.wwwrite.build();
        });

        it('should write ouput files', function() {
            _.each(tree, function(filePath) {
                var file = _.find(this.wwwrite.fileTree, function(item) {
                    return item.path.origin === filePath;
                });
                fs.existsSync(file.path.dest).should.be.true;
            }, this);
        });
    });
});