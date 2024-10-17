import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { getAdminById } from '../services/admin';
import { getSessionToken } from '../services/token';
import { TokenType } from '../schema/Token';
import { ROLE } from './auth';

// Middleware function to check authentication for refresh token and send id to next middleware 
export const refreshTokenAuthMiddleware = (req : Request, res:Response, next:NextFunction) => {
  passport.authenticate('jwt', { session: false }, async (err:any, user:any, info:any) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!user) {
      return res.status(500).json({ message: "Invalid Token" });
    }
    if (!user?._id) {
        return res.status(401).json({ message: "Please sign in to access this feature" });
    }
    const existingAdmin = await getAdminById(user?._id);
    if (!existingAdmin?._id) {
      return res.status(401).json({ message: "Admin profile does not exist." });
    }
    const adminSession = await getSessionToken(existingAdmin?._id, TokenType.Access);
    const token = req.headers.authorization?.replace('Bearer ', '');
    if(!adminSession?._id || token != adminSession?.refreshToken) {
        return res.status(401).json({ message: "Admin has no active session currently." });
    }
    const { password: _p, ...result } = existingAdmin;
    const admin = result as any;
    req.user = {...admin, role: ROLE.ADMIN };
    next();
  })(req, res, next);
};