const passport = require('passport');
import { Request, Response, NextFunction } from 'express';
import { getUserById } from '../services/user';
import { getAdminById } from '../services/admin';
import { getSessionToken } from '../services/token';

export enum ROLE {
  USER = "USER",
  ADMIN = "ADMIN"
}

// Middleware function to check authentication it send role id to next middleware 
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, async (err:any, user:any, info:any) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      if (!user) {
        return res.status(500).json({ message: "Invalid Token" });
      }
      if(!user?._id) {
        return res.status(401).json({ message: 'Please sign in to access this feature' });
      }
      const token = req.headers.authorization?.replace('Bearer ', '');
      const existingUser = await getUserById(user?._id);
      const existingAdmin = await getAdminById(user?._id);
      if(!existingUser?._id && !existingAdmin?._id) {
        return res.status(401).json({ message: "User profile does not exist." });
      }
      const adminId = existingAdmin?._id?.toString() || "";
      const userId = existingUser?._id?.toString() || "";
      const userSession = await getSessionToken(adminId, userId);
      if(!userSession?._id || userSession?.expireAt.getTime() < Date.now() || token != userSession?.value) {
        return res.status(401).json({ message: "User has no active session currently." });
      }
      req.user = {...user, role: userId ? ROLE.USER : ROLE.ADMIN };
      next();
    })(req, res, next);
};
