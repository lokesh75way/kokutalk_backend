import express from "express";
import passport from "passport";
import expressAsyncHandler from "express-async-handler";
import createHttpError from "http-errors";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import { createUserToken } from "../services/passport-jwt";
import * as AdminService from "../services/admin";
import { authMiddleware } from "../middleware/auth";
import { createAdminToken } from "../services/passport-jwt";

const router = express.Router();

router.post(
  "/register",
  validate("admin:register"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const existingUser = await AdminService.getAdminByEmail(req.body.email);
    if(existingUser?._id) {
      throw createHttpError(400, { message: "Admin already registered with provided email" });
    }
    const data = await AdminService.createAdmin(req.body);
    res.send(createResponse({ ...await createAdminToken(data!), user: data}, "Registration successful for new admin"))
  })
)

router.post(
  "/login",
  validate("admin:login"),
  catchError,
  passport.authenticate("admin-login", { session: false }),
  expressAsyncHandler(async (req, res) => {
    res.send(
      createResponse({ ...await createAdminToken(req.user!), user: req.user }, "Login successful for admin")
    );
  })
)

export default router;