import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as FaceBookStrategy } from 'passport-facebook';
import * as config from 'config';
import { NextFunction } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { ISecrets } from './config/ISecrets';
import { AuthDb, IUserAuth } from './auth-db';

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
},async (accessToken, refreshToken, profile, done) => {
    try {
        const auth: IUserAuth = await AuthDb.facebook.upsert(accessToken, refreshToken, profile);
        done(null, auth);
    } catch (err) {
        done(err);
    }
});


passport.serializeUser((auth: IUserAuth, done) => {
    done(null, { authId: auth._id });
});

passport.deserializeUser(async (session: { authId: string }, done) => {
    try {
        const auth: IUserAuth = await AuthDb.get(session.authId);
        done(null, auth);
    } catch (err) {
        done(err);
    }
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
