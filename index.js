//index.js/
// nodeJS login app using ExpressJS and PassportJS

var port = process.env.PORT || 8081; //select your port or let it pull from your .env file
var portSSL = 8080;

var	express = require('express'),
	http = require('http'),
	https = require('https'),
	fs = require('fs'),
	exphbs = require('express-handlebars'),
	morgan = require('morgan'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	TwitterStrategy = require('passport-twitter'),
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
	FacebookStrategy = require('passport-facebook');

var strategy = "";

var config = require('./config.js');

morgan.token('date', function(){
	return new Date().toString()
});

var funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work
var optionsSSL = {
	ca: fs.readFileSync(config.fs.ca),
	key: fs.readFileSync(config.fs.key),
	cert: fs.readFileSync(config.fs.cert)
};
var app = express();

//===============PASSPORT=================
// Passport session setup.
passport.serializeUser(function(user, done) {
	console.log("serializing " + user.username);
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	console.log("deserializing: ");
	console.log(obj);
	done(null, obj);
});

// Use the LocalStrategy within Passport to login/"signin" users.
passport.use('local-signin', new LocalStrategy(
	{passReqToCallback : true}, //allows us to pass back the request to the callback
	function(req, username, password, done) {
		funct.localAuth(username, password)
		.then(function (user) {
			if (user) {
				console.log("LOGGED IN AS: " + user.username);
				req.session.success = 'You are successfully logged in ' + user.username + '!';
				done(null, user);
			}
			if (!user) {
				console.log("COULD NOT LOG IN");
				req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
				done(null, user);
			}
		})
		.fail(function (err){
			console.log(err.body);
		});
	}
));
// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy(
	{passReqToCallback : true}, //allows us to pass back the request to the callback
	function(req, username, password, done) {
		funct.localReg(username, password)
		.then(function (user) {
			if (user) {
				console.log("REGISTERED: " + user.username);
				req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
				done(null, user);
			}
			if (!user) {
				console.log("COULD NOT REGISTER");
				req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
				done(null, user);
			}
		})
		.fail(function (err){
			console.log(err.body);
		});
	}
));

passport.use(new TwitterStrategy({
	consumerKey: config.twitter.key,
	consumerSecret: config.twitter.secret,
	callbackURL: config.twitter.callback
	},
	function(token, tokenSecret, profile, done) {
		strategy = "twitter";
		funct.oAuth(profile, token, strategy)
		.then(function (user) {
			if (user) {
				console.log("user:");
				console.log(user);
				console.log("LOGGED IN AS: " + user.username);
				return done(null, user);
			} else if (!user) {
				console.log("COULD NOT LOG IN");
				return done(null, user);
			}
		})
		.fail(function (err){
			console.log(err.body);
		});
	}
));

passport.use(new GoogleStrategy({
		clientID: config.google.id,
		clientSecret: config.google.secret,
		callbackURL: config.google.callback
	},
	function(accessToken, refreshToken, profile, done) {
		strategy = "google";
		funct.oAuth(profile, accessToken, strategy)
		.then(function (user) {
			if (user) {
				console.log("LOGGED IN AS: " + user.username);
				return done(null, user);
			} else if (!user) {
				console.log("COULD NOT LOG IN");
				return done(null, user);
			}
		})
		.fail(function (err){
			console.log(err.body);
		});
	}
));
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/signin');
}

//===============EXPRESS================
// Configure Express
app.use(morgan('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: config.session, saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
	var err = req.session.error,
		msg = req.session.notice,
		success = req.session.success;

	delete req.session.error;
	delete req.session.success;
	delete req.session.notice;

	if (err) res.locals.error = err;
	if (msg) res.locals.notice = msg;
	if (success) res.locals.success = success;

	next();
});

// Configure express to use handlebars templates
var hbs = exphbs.create({
	defaultLayout: 'main', //we will be creating this layout shortly
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============ROUTES=================
//displays our homepage
app.get('/', function(req, res){
	res.render('home', {user: req.user});
});

//displays our signup page
app.get('/signin', function(req, res){
	res.render('signin');
});

//displays our secret page
app.get('/secret', function(req, res){
	res.render('secret', {user: req.user});
});

app.get('/*.jpg', function(req, res, next){
	if (req.user){
		next();
	} else {
		res.redirect('/signin');
	}
});

app.use(express.static(__dirname + '/img'));

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
	successRedirect: '/',
	failureRedirect: '/signin'
	})
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
	successRedirect: '/',
	failureRedirect: '/signin'
	})
);

app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback',
		  passport.authenticate('twitter', { successRedirect: '/',
											 failureRedirect: '/signin' }));


app.get('/auth/google', passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/plus.login' }));

app.get('/auth/google/callback',
		  passport.authenticate('google', { successRedirect: '/',
											 failureRedirect: '/signin' }));

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
	var name = req.user.username;
	console.log("LOGGING OUT " + req.user.username)
	req.logout();
	res.redirect('/');
	req.session.notice = "You have successfully been logged out, " + name + "!";
});

//===============PORT=================
http.createServer(app).listen(port);
https.createServer(optionsSSL, app).listen(portSSL);
console.log("listening on " + port + " (http) and " + portSSL + " (https)");
