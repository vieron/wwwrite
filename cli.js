#!/usr/bin/env node

var _ = require('lodash');
var pkg = require(__dirname + '/package.json');
var program = require('commander');
var inquirer = require('inquirer');
var Deferred = require('JQDeferred');
var rsync = require('rsyncwrapper').rsync;
var moment = require('moment');
var _slug = require('slug');
var fs = require('fs-extra');
var path = require('path');
var exec = require('child_process').exec;
var WWWrite = require('./wwwrite');


var metadata = function(data) {
		return '---\n' +
				_.map(data, function(val, key) {
					return key + ': ' + val
				}).join('\n') +
				'\n---\n\n';
	},
	build = function() {
		var wwwrite = new WWWrite();
		return wwwrite.run(); //promise
	}

program
	.version(pkg.version)
	.option('-f, --force', 'Force destructive actions');

program
   .command('init')
   .description('Create a wwwrite project')
   .action(function(){
		inquirer.prompt([
			{
				type: "input",
				name: "name",
				message: "The name of your project",
				default: "mywwwrite"
			},
			{
				type: "input",
				name: "author",
				message: "Author's name",
				default: process.env.USER
			},
			{
				type: "input",
				name: "description",
				message: "Site description"
			},
			{
				type: "input",
				name: "url",
				message: "Production URL for the RSS feed",
				default: "http://mysite.com"
			},
			{
				type: "input",
				name: "typekit_id",
				message: "Typekit ID",
				default: false
			},
			{
				type: "input",
				name: "disqus_shortname",
				message: "Disqus Shortname",
				default: false
			}
		], function(answers) {
			var sitePath = path.join('./', answers.name);
			var templatePath = path.join(__dirname, 'template/');
			var config_tpl = fs.readFileSync(path.join(templatePath, 'wwwrite.json')).toString();
			var configJSON = _.template(config_tpl, answers);

			// create project dir
			fs.mkdirsSync(answers.name);
			// create wwwrite config file from input data
			fs.outputFileSync(path.join(sitePath, 'wwwrite.json'), configJSON);
			// copy template files
			fs.copySync(path.join(templatePath, '_wwwrite'), path.join(sitePath, '_wwwrite/'));
		});
	});

program
	.command('edit <file>')
	.description('Edit a file')
	.action(function(file) {
		exec('open ' + file, function (error, stdout, stderr) {
		  	if (error) console.log(error, stdout, stderr);
		});
	})

program
   .command('new')
   .description('Create a new page')
   .action(function(){
		inquirer.prompt([
			{
				type: "input",
				name: "title",
				message: "Title",
				default: "Hello world"
			},
			{
				type: "input",
				name: "date",
				message: "Date",
				default: moment().format('YYYY-MM-DD')
			},
			{
				type: "input",
				name: "draft",
				message: "It's a draft?",
				default: false
			}
		], function(answers) {
			var slug = _slug(answers.title);
			var filePath = path.join(slug.toLowerCase() + '.md');
			var fileExists = fs.existsSync(filePath);

			if (! fileExists || (fileExists && program.force)) {
				fs.outputFileSync(filePath, metadata(answers));
				console.log('Article "%s" created successfully', answers.title);
			} else {
				console.log('WARNING: File "%s" already exists. It could not be created.', filePath);
			}
		});
	});

program
	.command('build')
	.description('Build the site')
	.action(function() {
		build().done(function() {
			process.exit(0);
		}).fail(function() {
			process.exit(1);
		});
	});

program
	.command('deploy')
	.description('Deploy the site')
	.action(function() {
		build().done(function(wwwrite) {
			if (! (wwwrite.siteData.deploy && wwwrite.siteData.deploy.dest)) {
				console.log('There is no configuration defined to deploy this site.');
				return;
			}

			var deploy_config = _.extend({
				recursive: true,
				ssh: true,
				deleteAll: true,
				src: wwwrite.opts.outPath,
				exclude: [".DS_Store", ".gitignore"]
			}, wwwrite.siteData.deploy);

			console.log('Deploying site to %s ...', deploy_config.dest);

			rsync(deploy_config, function(error, stdout, stderr, cmd) {
				if (error) {
					console.log(error.message);
					process.exit(1);
					return;
				}
				stdout && console.log(stdout);
				console.log('Site Deployed!');
				process.exit(0);
			})
		});
	});

program.parse(process.argv);
