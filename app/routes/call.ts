import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import { authMiddleware } from "../middleware/auth";
import { getCallLog, makeCall, updateCallStatus } from "../services/call";
import twilio from "twilio";

const router = express.Router();

router.post(
  "/dial",
  authMiddleware,                            
  validate("call:add"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const { phoneNumber, countryCode }: { phoneNumber: string, countryCode: string } = req.body; 
    
    const response = await makeCall(phoneNumber, countryCode, req.user!);
    res.send(createResponse(response, "Called to user"));
  })
)

// Webhook url to update call status
router.post(
  "/update",
  twilio.webhook({ validate: false }),
  validate("call:update"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const response = await updateCallStatus(req.body.CallSid);
    res.send(createResponse({}, "Call status updated"));
  })
)

router.get(
  "/log",
  authMiddleware,                            
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const response = await getCallLog(userId, req.query);
    res.send(createResponse(response, "Call logs fetched successfully"));
  })
)

export default router;