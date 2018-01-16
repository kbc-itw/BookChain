import { Router, Response, Request } from 'express';
import { isLocator, isISBN } from '../util';
import { logger } from '../logger';
import { ErrorMessages } from '../messages';
import { passport } from '../authenticator';

export function createAuthenticationRouter(): Router {
    const router = Router();
    // TODO redirect
    router.post('/local', passport.authenticate('local'), (req: Request, res: Response) => res.send(200));
    router.get('/facebook', passport.authenticate('facebook'));
    router.get('/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));

    return router;
}
