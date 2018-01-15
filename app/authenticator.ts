import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as FaceBookStrategy } from 'passport-facebook';
import * as config from 'config';

export const passport = new Passport();
const domain = config.get<string>('domain');
const facebookConfig = require('../config/secrets.json').facebook;

const localStrategy = new LocalStrategy((username, password, done) => {
    if (process.env.NODE_ENV === 'deployment') {
        done(true);
    } else {
        done(false, { username, password });
    }
});

const facebookStrategy = new FaceBookStrategy({
    clientID: facebookConfig.facebook_app_id,
    clientSecret: facebookConfig.facebook_app_secret,
    callbackURL: domain + '/auth/facebook/callback',
},(accessToken, refreshToken, profile, done) => {
    done(null, null);
});



passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});



passport.use(localStrategy);
passport.use(facebookStrategy);
