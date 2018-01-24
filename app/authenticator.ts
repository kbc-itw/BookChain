import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as FaceBookStrategy } from 'passport-facebook';
import * as config from 'config';
import { NextFunction } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { ISecrets } from './config/ISecrets';

export const passport = new Passport();
const domain = config.get<string>('domain');
const secrets = require('../config/secrets.json') as ISecrets;

const localStrategy = new LocalStrategy((username, password, done) => {
    if (process.env.NODE_ENV === 'deployment') {
        done(true);
    } else {
        done(false, { username, password });
    }
});

const facebookStrategy = new FaceBookStrategy({
    clientID: secrets.facebook.FACEBOOK_APP_ID,
    clientSecret: secrets.facebook.FACEBOOK_APP_SECRET,
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

export function isAuthenticated(req:Request, res:Response, next:NextFunction): void {
    if (process.env.NODE_ENV !== 'deployment' || req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/auth/facebook/');
    }
}
