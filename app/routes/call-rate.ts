import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import * as CallRateService from "../services/call-rate";
import { authMiddleware, ROLE } from "../middleware/auth";
import { checkPermission } from "../middleware/check-permission";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validate("call-rate:add"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await CallRateService.addCallRate(userId, req.body);
    res.send(createResponse(data, "Call rate added succesfully"))
  })
)

router.put(
  "/:id",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validateIdParam("id"),
  catchError,
  validate("call-rate:update"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const callRateId: string = req.params.id;
    const data = await CallRateService.updateCallRate(userId, callRateId, req.body);
    res.send(createResponse(data, "Call rate updated succesfully"))
  })
)

router.get(
  "/",
  authMiddleware,
  validate("call-rate:get"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await CallRateService.getCallRate(userId, req.query);
    res.send(createResponse(data, "Call rate list fetched succesfully"))
  })
)

router.get(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const callRateId: string = req.params.id;
    const data = await CallRateService.getCallRateById(userId, callRateId);
    res.send(createResponse(data, "Call rate detail fetched successfully"))
  })
)

router.delete(
  "/:id",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const callRateId: string = req.params.id;
    const data = await CallRateService.deleteCallRate(userId, callRateId);
    res.send(createResponse(data, "Call rate deleted successfully"))
  })
)

export default router;