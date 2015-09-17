var config = {};

config.twitter = {};
config.google = {};
config.fs = {};
config.port = {};

config.twitter.key = "Your Twitter API key";
config.twitter.secret = "Your Twitter API secret";
config.twitter.callback = "[url]/auth/twitter/callback";

config.google.id = "Your Google app ID";
config.google.secret = "Your Google app secret";
config.google.callback = "[url]/auth/google/callback";

config.fs.ca = "/etc/ssl/ca-certificate.pem";
config.fs.key = "/etc/ssl/private/server.key";
config.fs.cert = "/etc/ssl/server.crt";

config.activateSSL = false;

config.port.http = 3000;
config.port.https = 3001;

config.session = "super secret session password";

config.postgres = "postgres://user:password@localhost/challenge";

module.exports = config;
