module.exports = function(app, config, passport, basicStrategy, cookieParser, session) {
  var users = config.users;
  var findByUsername = function(username, fn){
        for (var i = 0, len = users.length; i < len; i++) {
          var user = users[i];
              if (user.username === username) {
                return fn(null, user);
              }
        }
        return fn(null, null);
  };
  
  passport.use(new basicStrategy({
    },
    function(username, password, done) {
      process.nextTick(function () {
        findByUsername(username, function(err, user) {
          if (err) { return done(err); }
          if (!user) { return done(null, false); }
          if (user.password != password) { return done(null, false); }
          return done(null, user);
        });
      });
    }
  ));
  
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
  
  app.use(cookieParser);
  app.use(session);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(passport.authenticate('basic'));
};