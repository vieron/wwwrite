(function() {

"use strict";

var _ = require('lodash');
var path = require('path');

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

        return '<a href="' + path.join(context.path.relRoot, item.path.rootDest) + '">' + item.page.title + '</a>';
    };
}


module.exports.register = function(env, wwwrite) {
    env.addExtension('linkto', new LinkToExtension(wwwrite));
};

})();
