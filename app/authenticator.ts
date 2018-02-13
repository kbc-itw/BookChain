import { Passport } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as FaceBookStrategy } from 'passport-facebook';
import { NextFunction } from 'express';
import { Request, Response } from 'express-serve-static-core';
import { ISecrets } from './config/ISecrets';
import { AuthDb, IUserAuth } from './auth-db';

export const passport = new Passport();

const secrets = require('../config/secrets.json') as ISecrets;

const localStrategy = new LocalStrategy((username, password, done) => {
    if (process.env.NODE_ENV === 'production') {
        done(true);
    } else {
        done(false, { username, password });
    }
});

const facebookStrategy = new FaceBookStrategy({
    clientID: secrets.facebook.FACEBOOK_APP_ID,
    clientSecret: secrets.facebook.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback',
},async (accessToken, refreshToken, profile, done) => {
    try {
        const auth: IUserAuth = await AuthDb.facebook.upsert(accessToken, refreshToken, profile);
        done(null, auth);
    } catch (err) {
        done(err);
    }
});


passport.serializeUser((auth: IUserAuth & { _id?: string }, done) => {
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
    if (process.env.NODE_ENV !== 'production' || req.isAuthenticated()) {
        if (req.user && (!req.user.localId || !req.user.displayName)) {
            res.redirect('/client/view/user/register');
        }
        next();
    } else {
        res.redirect('/auth/facebook/');
    }
}
