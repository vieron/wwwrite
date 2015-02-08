// for reference:  https://github.com/SirAnthony/urlreverser/blob/master/lib/nunjucks.js

"use strict";

var _ = require('lodash');
var path = require('path');

// Usage:
//
// {% link_to "labs/index.html" %}
// {% link_to "labs" %}


var mixin = {
    parse: function(parser, nodes, lexer) {
        var tok = parser.nextToken();
        var args = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(tok.value);
        return new nodes.CallExtensionAsync(this, 'run', args);
    }
}


function LinkToExtension(wwwrite) {
    this.tags = ['link_to'];

    this.parse = mixin.parse.bind(this);
    this.run = function(args, filePath, done) {
        _.isObject(filePath) && (filePath = filePath.path.rootSrcPath);

        var context = args.ctx;
        wwwrite.db.findOne({'path.rootSrcPath': filePath}, function(err, item) {
            if (err || !item) { return done(err); };

            var targetDirPath = item.path.dirname + '/';
            var currentDirPath = context.path.dirname + '/';
            var isActive = currentDirPath.match(new RegExp('^' + targetDirPath), 'g');

            var href = path.join(context.path.relRoot, item.path.rootDestPath);

            done(null, '<a href="' + href + '" ' + (isActive ? 'class="is-active"' : '') + '>' +
                            item.metadata.title +
                        '</a>');
        });

    }
}

function URLToExtension(wwwrite) {
    this.tags = ['url_to'];

    this.parse = mixin.parse.bind(this);
    this.run = function(args, filePath, done) {
        _.isObject(filePath) && (filePath = filePath.path.rootSrcPath);

        var context = args.ctx;
        wwwrite.db.findOne({'path.rootSrcPath': filePath}, function(err, item) {
            if (err || !item) { return done(err); };

            var targetDirPath = item.path.dirname + '/';
            var currentDirPath = context.path.dirname + '/';
            var href = path.join(context.path.relRoot, item.path.rootDestPath);

            done(null, href);
        });

    }
}

module.exports.register = function(env, wwwrite) {
    env.addExtension('LinkToExtension', new LinkToExtension(wwwrite));
    env.addExtension('URLToExtension', new URLToExtension(wwwrite));
};