const passport = require('passport');
import { Request, Response, NextFunction } from 'express';

// Middleware function to check authentication it send role id to next middleware 
export const authMiddleware = (req : Request, res:Response, next:NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err:any, user:any, info:any) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    // console.log(user);
    next();
  })(req, res, next);
};
