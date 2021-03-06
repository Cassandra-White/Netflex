const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const mongo = require('../../../mongo');
const signupModule = require("../../../src/signupModule");

router.post('/', function(req, res, next) {
	if (req.session && req.session._id) {
		res.sendStatus(300);
	}
	else {
		const post = req.body;

		signupModule(req, post, null, false, (result, error = 0) => {
			if (error) {
				console.log(result)
				res.status(300).json(result);
			} else {
				res.status(201).json(result);
			}
		});
	}
});

module.exports = router;
