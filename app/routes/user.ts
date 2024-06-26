import express from "express";
import passport from "passport";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import { createUserToken } from "../services/passport-jwt";
import * as UserService from "../services/user";
import * as OtpService from "../services/otp";
import { authMiddleware } from "../middleware/auth";
import { addNumber, deleteNumber, getNumber, makeCall, updateCallStatus, validateNumber } from "../services/call";
const twilio = require('twilio');

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
  "/make-call",
  authMiddleware,                            
  validate("user:send-otp"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { phoneNumber, countryCode }: { phoneNumber: string, countryCode: string } = req.body ; 
    
    const response = await makeCall(phoneNumber, countryCode, req.user!);
    res.send(createResponse(response, "Called to user"));
  })
)

router.post(
  "/update-call",
  twilio.webhook({ validate: false }),
  expressAsyncHandler(async (req, res) => {
    const response = await updateCallStatus(req.body.CallSid);
    res.send(createResponse({}, "Call status updated"));
  })
)

router.post(
  "/add-number",
  // authMiddleware,
  validate("user:send-otp"),
  catchError,
  twilio.webhook({ validate: false }),
  expressAsyncHandler(async (req, res) => {
    console.log("\n\n req body to add number", req.body)
    const response = await addNumber(req.body.countryCode + req.body.phoneNumber);
    console.log("\n\n response to add number", response)
    res.send(createResponse(response, "Otp sent to phone number. Please use it to verify your number"));
  })
)

router.post(
  "/verify-number",
  // authMiddleware,
  // validate("user:update-name"),
  // catchError,
  twilio.webhook({ validate: false }),
  expressAsyncHandler(async (req, res) => {
    console.log("\n\n req body to verify number", req.body)
    const response = await validateNumber(req.body);
    res.send(createResponse(response, "Number verified"));
  })
)

router.post(
  "/get-number",
  // authMiddleware,
  validate("user:send-otp"),
  catchError,
  twilio.webhook({ validate: false }),
  expressAsyncHandler(async (req, res) => {
    console.log("\n\n req body to get added number", req.body)
    const response = await getNumber(req.body.countryCode + req.body.phoneNumber);
    res.send(createResponse(response, "Number fetched"));
  })
)

router.post(
  "/delete-number",
  // authMiddleware,
  validate("user:send-otp"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    console.log("\n\n req body to verify number", req.body)
    const response = await deleteNumber(req.body.countryCode + req.body.phoneNumber);
    res.send(createResponse(response, "Number deleted"));
  })
)

export default router;
