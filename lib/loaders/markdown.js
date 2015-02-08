var marked = require('marked');
var hljs = require('highlight.js');

hljs.configure({classPrefix: ''});
var renderer = new marked.Renderer();
renderer.code = function(code, language){
    language || (language = '');
    var code = language ? hljs.highlight(language, code).value :
        hljs.highlightAuto(code).value;

    return '<pre class="hljs"><code class="' + language + '">' +
                code +
            '</code></pre>';
};

marked.setOptions({
    langPrefix: '',
    renderer: renderer
});


module.exports = {
    ext: ['md', 'markdown'],
    outExt: 'html',
    transform: function(fileContents) {
        return marked(fileContents.toString());
    },
    defaults: {
        outputPage: true
    }
}