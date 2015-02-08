var _ = require('lodash');
var path = require('path');


module.exports.register = function(env, wwwrite) {

    env.addFilter('sibling_pages', function(pathData, callback) {
        wwwrite.db.find({
            outputPage: true,
            // exclude partials
            isPartial: {
                $ne: true
            },
            // exclude documents with listing: false
            'metadata.listing': {
                $ne: false
            },
            // target siblings
            $or: [
                {'path.dirname': pathData.dirname, isFile: true},
                {'path.parentDirname': pathData.dirname, isDir: true}
            ],
            // ignore current document
            $not: {'path.srcPath': pathData.srcPath}
        })
        // stickys on the top, and the rest ordered by timestamp
        .sort({'metadata.sticky': -1, 'metadata.date.timestamp': -1})
        .exec(function(err, items) {
            callback(null, items);
        });
    }, true);


    env.addFilter('relativeTo', function(outputPath, currentPath) {
        return path.relative(path.dirname(currentPath.outFilePath), outputPath);
    });

};