const express = require('express');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	service: 'gmail',
	host: 'smtp.gmail.com',
      port: 465,
      secure: true,
	auth: {
		user: 'netflex.test.mail@gmail.com',
		pass: 'dreggman132465'
	}
});

module.exports = transporter;