import express from "express";
import passport from "passport";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import { createUserToken } from "../services/passport-jwt";
import * as UserService from "../services/user";
import * as OtpService from "../services/otp";
import { authMiddleware } from "../middleware/auth";
import { addNumber, deleteNumber, getNumber, makeCall, updateCallStatus, validateNumber } from "../services/call";
const twilio = require('twilio');
import createHttpError from "http-errors";

const router = express.Router();

router.post(
  "/send-otp",
  validate("user:send-otp"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { phoneNumber, countryCode }: { phoneNumber: string, countryCode: string } = req.body ; 
    await OtpService.saveOtp(phoneNumber, countryCode);
    res.send(createResponse({}, "Otp sent to verify phone number"))
  })
)

router.put(
  "/verify-otp",
  validate("user:verify-otp"),
  catchError,
  passport.authenticate("login", { session: false }),
  expressAsyncHandler(async (req, res) => {
    res.send(
      createResponse({ ...createUserToken(req.user!), user: req.user }, "User verified for provided otp")
    );
  })
)

router.put(
  "/update-name",
  authMiddleware,
  validate("user:update-name"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const updatedUser = await UserService.updateUser(userId, req.body);
    res.send(createResponse(updatedUser, "Name updated successfully"));
  })
)

router.post(
  "/add-number",
  authMiddleware,
  validate("user:add-number"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId = req?.user?._id || "";
    const response = await UserService.addPhoneNumber(userId, req.body);
    res.send(createResponse(response, "Phone number added successfully"));
  })
)

router.post(
  "/update-number/:id",
  authMiddleware,
  validate("user:add-number"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId = req?.user?._id || "";
    const phoneNumberId = req.params.id;
    const response = await UserService.updatePhoneNumber(userId, phoneNumberId, req.body);
    res.send(createResponse(response, "Phone number updated successfully"));
  })
)

router.post(
  "/get-numbers",
  authMiddleware,
  validate("user:get-number"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId = req?.user?._id || "";
    const response = await UserService.getPhoneNumber(userId, req.query);
    res.send(createResponse(response, "Phone number list fetched succesfully"));
  })
)

router.post(
  "/delete-number/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId = req?.user?._id || "";
    const phoneNumberId = req.params.id;
    const response = await UserService.deletePhoneNumber(userId, phoneNumberId);
    res.send(createResponse(response, "Phone number deleted successfully"));
  })
)

router.post(
  "/verify-number",
  twilio.webhook({ validate: false }),
  expressAsyncHandler(async (req, res) => {
    console.log("\n\n req body to verify number", req.body)
    const response = await validateNumber(req.body);
    res.send(createResponse(response, "Number verified"));
  })
)

router.post(
  "/validate-number/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId = req?.user?._id || "";
    const phoneNumberId = req.params.id;
    const existingNumber = await UserService.getPhoneNumberById(userId, phoneNumberId);
    if(!existingNumber?.number?._id) {
      throw createHttpError(400, { message: "Phone number is either deleted or doesn't exist." });
    }
    const response = await UserService.validatePhoneNumberById(userId, phoneNumberId, existingNumber?.number);
    const message = response?.number?.sid ? "Number verified" : "Otp send to your phone number. Please use it for verification";
    res.send(createResponse(response, message));
  })
)

export default router;
