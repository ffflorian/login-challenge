// functions.js/
var bcrypt = require('bcryptjs'),
	Q = require('q'),
	pg = require('pg');

//used in local-signup strategy
exports.localReg = function (username, password) {
	var deferred = Q.defer();
	var hash = bcrypt.hashSync(password, 8);
	var user = {
		"username": username,
		"password": hash,
		"avatar": "https://raw.githubusercontent.com/cburmeister/placepuppy/master/placepuppy/static/img/puppy.jpeg",
		"strategy": "Local"
	}
	var conString = "postgres://postgres:bla123@localhost/challenge";
	var client = new pg.Client(conString);
	//check if username is already assigned in our database

	client.connect(function(err) {
		if(err) {
			return console.error('could not connect to postgres', err);
		}

		console.log("querying for user '" + username + "'...");
		client.query("SELECT 1 FROM users WHERE name='" + username + "'", function(err, result) {
			if (err) {
				return console.error('error running query', err);
			}
			console.log("length:" + result.rows.length);
			if (result.rows.length > 0) {
				console.log('Username already exists');
				deferred.resolve(false);
			} else {
				console.log('Username is free for use');
				client.query("INSERT INTO users(name, pass) values('" + username + "', '" + hash + "')", function (err, result) {
					if (err) {
						return console.error('error running query', err);
					}
					console.log("USER: " + user);
					deferred.resolve(user);
				});
			}
		});
	});
	return deferred.promise;
};

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
	var deferred = Q.defer();
	var conString = "postgres://postgres:bla123@localhost/challenge";
	var client = new pg.Client(conString);
	//check if username is already assigned in our database

	client.connect(function(err) {
		if(err) {
			return console.error('could not connect to postgres', err);
		}

		console.log("querying for user '" + username + "'...");
		client.query("SELECT * FROM users WHERE name='" + username + "'", function(err, result) {
			if (err) {
				return console.error('error running query', err);
			}
			if (result.rows.length > 0) {
				var row = result.rows[0];
				console.log("row:");
				console.log(row);
				console.log('username found');
				var hash = row.pass;
				console.log("compare: " + bcrypt.compareSync(password, hash));
				if (bcrypt.compareSync(password, hash)) {
					console.log("logging in " + row.name + "...");
					var user = {
						"username": username,
						"password": hash,
						"avatar": "https://raw.githubusercontent.com/cburmeister/placepuppy/master/placepuppy/static/img/puppy.jpeg",
						"strategy": "Local"
					}
					deferred.resolve(user);
				} else {
					console.log("PASSWORDS DO NOT MATCH");
					deferred.resolve(false);
				}
			} else {
				deferred.resolve(false);
				console.log("COULD NOT FIND USER IN DB FOR SIGNIN");
			}
		});
	});
	return deferred.promise;
}

exports.oAuth = function (profile, token, strategy) {
	var deferred = Q.defer();
	if (strategy == "twitter") {
		console.log("using twitter strategy");
		var user = {
			"username": profile.displayName,
			"password": token,
			"avatar": profile.photos[0].value,
			"strategy": "Twitter"
		}
		console.log(user);
		deferred.resolve(user);
	} else if (strategy == "google") {
		console.log("using google strategy");
		var user = {
			"username": profile.name.givenName,
			"password": token,
			"avatar": profile.photos[0].value,
			"strategy": "Google"
		}
		deferred.resolve(user);
	}
	return deferred.promise;
}
