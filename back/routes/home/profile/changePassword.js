const express = require('express');
const router = express.Router();

const mongo = require('../../../mongo');
const mongodb = mongo.getMongodb();
const bcrypt = require('bcrypt');

router.post('/', function(req, res, next) {

	const { oldPassword, newPassword } = req.body

	var errors = {}

	if (typeof oldPassword == 'undefined' || typeof newPassword == 'undefined') {
		error.error = "default l'un ou les champs est vide.";
	}
	else {
		if (newPassword.length < 6) {
			errors.newPassword = 'default password too short min : 6'
		}
		if (newPassword.length > 50) {
			errors.newPassword = 'default password too long max : 50'
		}
		if (!(/[a-zA-Z]/i.test(newPassword))) {
			errors.newPassword = 'default le password ne contient pas de lettre'
		}
		if (!i(/[0-9]/.test(newPassword))) {
			errors.newPassword = 'default le password ne contient pas de chiffre'
		}
	}

	if (!req.session || !req.session._id){
		errors.auth = 'default'
	}

	if (Object.keys(errors).length === 0) {

		const db = mongo.getDb();
		const collection = db.collection('users');

		collection.findOne({_id: new mongodb.ObjectId(req.session._id)}, function (error, result) {
			if (error) throw error;
			var oauth = false;
			if (!result.password) {
				oauth = true;
				result.password = '';
			}
			bcrypt.compare(oldPassword, result.password, function(error, result) {
				if (error) throw error;

				if (result !== true && !oauth) {
					errors.oldPassword = 'wrong'
					res.status(300).json(errors);
				}
				else {
					bcrypt.genSalt(10, function(err, salt) {
						bcrypt.hash(newPassword, salt, function(err, hash) {
							collection.update(
								{_id: new mongodb.ObjectId(req.session._id)},
								{$set: {password: hash}}, function (err, result) {
								if (err) throw err;

								res.sendStatus(202)
							});
						});
					});
				}
			});
		})
	}
	else {
		res.status(300).json(errors);
	}
});


module.exports = router;
