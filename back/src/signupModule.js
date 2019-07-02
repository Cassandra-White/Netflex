var express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
var fs = require('fs');
var request = require('request');

var mongo = require('../mongo');

module.exports = function(req, post, url, isOAuth, callback) {

	var error = {};
	var db = mongo.getDb();
	const collection = db.collection('users');

	if (!isOAuth) {
		Object.keys(post).filter(function(key, index) {
			if (key === 'password') {
				return false;
			}
			return true;
		}).map(function(key, index) {
			if (key !== 'oauth') {
				post[key] = post[key].trim();
			}
		});

		if (post.firstName && post.lastName) {
			post.firstName = post.firstName.toLowerCase().replace(/\s+/g, ' ');
			post.lastName = post.lastName.toLowerCase().replace(/\s+/g, ' ');
		}

		if (post.email) {
			post.email = post.email.toLowerCase();
		}

		if (!(post.firstName && post.lastName && post.login && post.email && post.password)) {
			error.default = "l'un des champs n'a pas été rempliq";
		}

		if (post.login) {
			if (post.login.length < 4) {
				error.login = 'default pas assez de caractère min 4';
			}
			if (post.login.length > 20) {
				error.login = 'default trop de caractere max : 20';
			}
			if (!(/^[a-zà-ÿ0-9]+$/i.test(post.login))) {
				error.login = 'default probleme de caractere speciaux ';
			}
		}

		if (post.email) {
			if (post.email.length > 50) {
				error.email = 'default email trop long  max : 50';
			}
			if (!(/^.+@.+\..+$/.test(post.email))) {
				error.email = 'default utilisation de caractères interdit';
			}
		}

		if (post.firstName) {
			if (post.firstName.length < 1) {
				error.firstName = 'default firstname trop court min : 1';
			}
			if (post.firstName.length > 20) {
				error.firstName = 'default firstname trop court max : 20';
			}
			if (!(/^[a-zà-ÿ ]+$/i.test(post.firstName))) {
				error.firstName = 'default utilisation de caractères interdit';
			}
		}


		if (post.lastName) {
			if (post.lastName.length < 1) {
				error.lastName = 'default firstname trop court min : 1';
			}
			if (post.lastName.length > 20) {
				error.lastName = 'default firstname trop court max : 20';
			}
			if (!(/^[a-zà-ÿ ]+$/i.test(post.lastName))) {
				error.lastName = 'default utilisation de caractères interdit';
			}
		}


		if (post.password) {
			if (post.password.length < 6) {
				error.password = 'default password trop court';
			}
			if (post.password.length > 50) {
				error.password = 'default password trop long';
			}
			if (!(/[a-z]/i.test(post.password))) {
				error.password = 'default le passxord ne contient pas de lettre';
			}
			if (!(/[0-9]/.test(post.password))) {
				error.password = 'default le password ne contient pas de chiffre';
			}
		}
	}

	if (isOAuth) {
		var oauthWhich
		if (post.oauth.google !== undefined) {
			oauthWhich = {'google': post.oauth.google}
		}
		else if (post.oauth.facebook !== undefined) {
			oauthWhich = {'facebook': post.oauth.facebook}
		}
		collection.findOne({oauth: oauthWhich}, function (err, result) {
			if (err) throw err;

			if (!result) {
				collection.findOne({email: post.email}, function (err, result) {
					if (err) throw err;

					if (result) {
						const userResult = result;
						var objTmp = Object.assign({}, result.oauth, post.oauth);

						collection.findAndModify({email: post.email}, [], {$set: {oauth: objTmp, }}, {new: true}, function (err, result) {
							if (err) throw err;
							if (!fs.existsSync('public/pictures/' + userResult._id.toString() + '.png') && typeof url != 'undefined') {
								request.head(url, function(err, res, body) {
									request(url).pipe(fs.createWriteStream('public/pictures/' + userResult._id.toString() + '.png')).on('close', function() {
										req.session._id = userResult._id;
										callback(result.value);
									});
								});
							}
							else {
								req.session._id = userResult._id;
								if (typeof url == 'undefined') {
									fs.createWriteStream('./public/pictures/' + req.session._id + '.png');
								}
								callback(result.value);
							}
						});
					}
					else {
						collection.insert(post, function (err, result) {
							if (err) throw err;
							if (typeof url != 'undefined') {
								request.head(url, function(err, res, body){
									request(url).pipe(fs.createWriteStream('public/pictures/' + result.ops[0]._id.toString() + '.png')).on('close', function() {
										req.session._id = result.ops[0]._id;
										callback(result.ops[0]);
									});
								});
							}
							else {
								req.session._id = result.ops[0]._id;
								fs.createWriteStream('./public/pictures/' + req.session._id + '.png');
								callback(result.ops[0]);
							}
						});
					}
				});
			}
			else {
				if (!fs.existsSync('public/pictures/'+result._id.toString()+'.png') && typeof url != 'undefined'){
					request.head(url, function(err, res, body){
						if (res.headers['content-type'] == 'image/jpeg' || res.headers['content-type'] == 'image/png') {
							request(url).pipe(fs.createWriteStream('public/pictures/'+result._id.toString()+'.png')).on('close', function() {
								req.session._id = result._id;
								callback(result);
							});
						}
						else {
							req.session._id = result._id;
							fs.createWriteStream('./public/pictures/' + req.session._id + '.png');
							callback(result);
						}
					});

				}
				else {
					req.session._id = result._id;
					if (typeof url == 'undefined') {
						fs.createWriteStream('./public/pictures/' + req.session._id + '.png');
					}
					callback(result);
				}
			}
		});
	}
	else {
		collection.findOne({email: post.email}, function (err, result) {
			if (err) throw err;

			if (result) {
				error.email = 'alreadyTaken';
			}

			collection.findOne({login: {$regex: new RegExp('^' + post.login + '$', 'i')}}, function (err, result) {
				if (err) throw err;

				if (result !== null) {
					error.login = 'alreadyTaken';
				}

				if (Object.keys(error).length === 0) {
					bcrypt.genSalt(10, function(err, salt) {
						bcrypt.hash(post.password, salt, function(err, hash) {
							post.password = hash;

							collection.insert(post, function (err, result) {
								if (err) throw err;

								req.session._id = result.ops[0]._id;
								fs.createWriteStream('./public/pictures/' + req.session._id + '.png');
								callback(result.ops[0]);
							});
						});
					});
				}
				else {
					callback(error, 1);
				}
			});
		});
	}
}
