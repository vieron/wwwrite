module.exports = {
    ext: ['html'],
    outExt: 'html',
    transform: require('./default').transform,
    defaults: {
        outputPage: true
    }
}