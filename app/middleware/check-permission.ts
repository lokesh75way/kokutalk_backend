import { Request, Response, NextFunction } from "express";
import { ROLE } from "./auth";
import createHttpError from "http-errors";

// Middleware to check role and permissions for user
export const checkPermission = (
  allowedRoles: string[] = [ROLE.ADMIN, ROLE.USER]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.user || ({} as any);

      if (!allowedRoles.includes(role)) {
        throw createHttpError(401, { message: "You are not authorized to perform the requested operation."})
      }
      next();
    } catch (error: any) {
      return res.status(403).send(createHttpError(403, { message: "You are not authorized to perform the requested operation."}));
    }
  };
};