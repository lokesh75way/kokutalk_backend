import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import { authMiddleware, ROLE } from "../middleware/auth";
import { getCall, getCallLog, makeCall, updateCallStatus } from "../services/call";
import twilio from "twilio";
import { checkPermission } from "../middleware/check-permission";

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
  checkPermission([ROLE.USER]),
  validate("call:get"),                            
  catchError,
  expressAsyncHandler(async (req, res) => {
    let userId =  req?.user?._id || "";
    const response = await getCallLog(userId, req.query);
    res.send(createResponse(response, "Call logs fetched successfully"));
  })
)

router.get(
  "/",
  authMiddleware,
  validate("call:get"),                            
  catchError,
  expressAsyncHandler(async (req, res) => {
    let userId =  req?.user?._id || "";
    const userRole = (req?.user as any)?.role || "";
    const userToSearch = (req.query.userId as string) || "";
    if(userRole == ROLE.ADMIN) {
      userId = userToSearch ? userToSearch : "";
    }
    const response = await getCall(userId, req.query);
    res.send(createResponse(response, "Call history fetched successfully"));
  })
)

export default router;