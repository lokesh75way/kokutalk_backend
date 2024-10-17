import express from "express";
import passport from "passport";
import expressAsyncHandler from "express-async-handler";
import createHttpError from "http-errors";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import * as AdminService from "../services/admin";
import { authMiddleware, ROLE } from "../middleware/auth";
import { createAdminToken } from "../services/passport-jwt";
import { checkPermission } from "../middleware/check-permission";
import { saveToken, updateToken, deleteSessionToken } from "../services/token";
import { TokenType } from "../schema/Token";
import { sendOtp } from "../services/email";
import { refreshTokenAuthMiddleware } from "../middleware/refreshTokenAuth";

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

router.post(
  "/forgot-password",
  validate("admin:forgot-password"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const existingAdmin = await AdminService.getAdminByEmail(req.body.email);
    if(!existingAdmin?._id) {
      throw createHttpError(400, { message: "Admin not registered with provided email" });
    }
    const adminName = existingAdmin?.name || "";
    const otp = await saveToken(existingAdmin?._id, TokenType.PasswordReset);
    await sendOtp(req.body.email, adminName, otp.value);
    res.send(createResponse({}, "OTP has been sent to your email address"));
  })
)

router.post(
  "/reset-password",
  validate("admin:reset-password"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const tokenDetails = await AdminService.matchAdminToken(req.body.otp, req.body.email, TokenType.PasswordReset);
    if(!tokenDetails[0]?.adminDetails?._id) {
      throw createHttpError(400, { message: "Password could not be reset with provided detail" });
    }
    await updateToken(tokenDetails[0], tokenDetails[0]?.adminDetails?._id, req.body, TokenType.PasswordReset);
    res.send(createResponse({}, "Admin Password reset successfully"));
  })
)

router.post(
  "/verify-otp",
  validate("admin:verify-otp"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const tokenDetails = await AdminService.matchAdminToken(req.body.otp, req.body.email, TokenType.PasswordReset);
    if(!tokenDetails[0]?.adminDetails?._id) {
      throw createHttpError(400, { message: "Provided otp could not  be verified" });
    }
    await updateToken(tokenDetails[0], tokenDetails[0]?.adminDetails?._id, req.body, TokenType.PasswordReset);
    res.send(createResponse({}, "Otp verified successfully"));
  })
)

router.post(
  "/refresh-token",
  refreshTokenAuthMiddleware,
  checkPermission([ROLE.ADMIN]),
  expressAsyncHandler(async (req, res) => {
    res.send(
      createResponse({ ...await createAdminToken(req.user!), user: req.user }, "Token refreshed successfully")
    );
  })
)

router.post(
  "/logout",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const adminId = req?.user?._id || ""
    const data = await deleteSessionToken(adminId, "");
    res.send(createResponse({}, "Admin logged out succesfully"));
  })
);

router.post(
  "/destroy-session",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const adminId = req?.user?._id || ""
    const data = await deleteSessionToken(adminId, "");
    res.send(createResponse({}, "Session destroyed succesfully"));
  })
);

router.put(
  "/change-password",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validate("admin:change-password"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const adminId =  req?.user?._id || "";
    const updatedAdmin = await AdminService.updateAdminPassword(adminId, req.body);
    res.send(createResponse({}, "Admin Password changed successfully"));
  })
)

router.put(
  "/profile",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validate("admin:profile-update"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const adminId =  req?.user?._id || "";
    const updatedAdmin = await AdminService.updateAdmin(adminId, req.body);
    res.send(createResponse(updatedAdmin, "Admin profile updated successfully"));
  })
)

router.get(
  "/dashboard",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validate("admin:dashboard"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const adminId =  req?.user?._id || "";
    const dashboard = await AdminService.getAdminDashboard(adminId, req.query);
    res.send(createResponse(dashboard, "Admin dashboard data fetched successfully"));
  })
)

router.get(
  "/customers",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validate("admin:dashboard"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const adminId =  req?.user?._id || "";
    const customer = await AdminService.getCustomers(adminId, req.query);
    res.send(createResponse(customer, "Customer data fetched successfully"));
  })
)

export default router;