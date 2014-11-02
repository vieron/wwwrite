(function() {

"use strict";

var _ = require('lodash');
var path = require('path');

// Usage:
//
// {% link_to "labs/index.html" %}
// {% link_to "labs" %}

function LinkToExtension(wwwrite) {
    this.tags = ['link_to'];

    this.parse = function(parser, nodes, lexer) {
        var tok = parser.nextToken();
        var args = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(tok.value);
        return new nodes.CallExtension(this, 'run', args);
    };

    this.run = function(args, filePath) {
        var context = args.ctx;
        var item = _(wwwrite.fileTree).find(function(item) {
            return item.path.rootDest === filePath;
        });

        if (!item) {
            item = _(wwwrite.dirTree).find(function(item) {
                return item.path.dirname === filePath;
            });
        }

        var targetDirPath = item.path.dirname + '/';
        var currentDirPath = context.path.dirname + '/';
        var isActive = currentDirPath.match(new RegExp('^' + targetDirPath), 'g');

        return '<a href="' +
                    path.join(context.path.relRoot, item.path.rootDest) +
                '" ' + (isActive ? 'class="is-active"' : '') + '>' +
                    item.page.title +
                '</a>';
    }
}

module.exports.register = function(env, wwwrite) {
    env.addExtension('linkto', new LinkToExtension(wwwrite));
};

})();
