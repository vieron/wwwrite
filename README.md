# wwwrite

A simple node library to generate kind of blog/wiki from file-system documents.

The main goal of **wwwrite** is to make writing documents easier, specially for developers writing techy articles with code examples and external resources.

**Why another static site builder?**

Basically because I wanted "pages/articles/wadus" to be generated from a file or from a folder. I need the possibility of treating each page as a different site (custom layout, custom styles, custom javascript, etc...).

The idea is that if you want to create a code-oriented article, maybe with some demos in different pages, it's useful to keep all the files related to the article wrapped into a folder that can be treated as a page.


## Overview
- By default you can write pages in markdown or just plain HTML.
- You can include custom css, or javascript files, by default written in Sass and JavaScript respectively.
- You are not tied to any file structure.
- Syntax highlighing using [highlightjs](https://highlightjs.org/).
- Use the power of a templating engine. Layouts, partials, includes, formatters, helpers...
- Page metadata using the mythical YAML front matter.
- Themable and extensible.
- Treat directories (if you want) as pages (directory/index.{md,html}).

	If a directory contains an `index.md` or `index.html` file, it is treated as a page. It means 	that is listed on navigation lists and the metadata is inherited from the `index.{md,html}` 	(YAML front matter) file.


### Global configuration and site data
There is a `wwwrite.json` file used to provide general configuration and site data. It looks like this:

```js
{
  "name": "vieron.log",
  "author": "Javi Sánchez-Marín",
  "description": "Meaningless writings and poorly written.",
  "typekit": {
  	"id": "d1sj2as"
  },
  "disqus": {
  	"shortname": "vieronlog"
  },
  "deploy": {
    "dest": "username@vieron.net:/sitest/vieron.log/"
  }
}
```


### YAML front matter special attributes

- title
- description
- comments (Boolean, by default `site.comments` value is used)
- template (template used to render the page)
- date (YYYY-MM-DD format)
- draft (file not included on the build)
- sticky (Number)
- listing (Boolean, by default is `true`. Exclude files to be listed on navigations)
- css (separated by commas, relative paths to the current file)
- js (separated by commas, relative paths to the current file)

`css` and `js` attribute values can be separated by commas, and paths are relative to the path of the current file.



### Templates

In the default theme, the following templates are included:

- empty.html
- post.html (by default)
- post-index.html

Actually there are more templates (feed.xml, base.html) used for composing, but they should not be used directly from the YAML front matter.


## Installation

    $ npm install -g wwwrite


## Usage

```js
var WWWrite = require('wwwrite');

var wwwrite = new WWWrite({
	writingsPath: './',
	buildPath: '_build/',
	themePath: '_wwwrite/',
	excludeDirs: ['_wwwrite', '.git', 'node_modules'],
	excudeFiles: ['.DS_Store', 'wwwrite.json'],
	excludePaths: ['run.js'],
	dateFormat: 'D MMM YYYY' // human readable format
});

wwwrite.run(); // parse and build
```

If you want, you can parse files before and build the site whenever you want:

```js
// instead of wwwrite.run() use:
wwwrite.parse();
wwwrite.build();
```


## CLI Usage

##### `$ wwwrite init`

Create a new site using wwwrite. It creates a new folder with the name supplied.

##### `$ wwwrite new`
Create a new page and fill some metadata.

##### `$ wwwrite build`
Build the site.

##### `$ wwwrite deploy`
Deploy the site.


### TODO

- asyncify (use Deferreds)
- tests
- seo_url in yml frontmatter overwrite default filename
- multiple targets for css and js files in theme
- link to page
- breadcrumbs