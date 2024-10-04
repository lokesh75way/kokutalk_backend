import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import * as PaymentService from "../services/payment";
import { authMiddleware, ROLE } from "../middleware/auth";
import { checkPermission } from "../middleware/check-permission";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  checkPermission([ROLE.USER]),
  // validate("payment:add"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await PaymentService.addPayment(userId, req.body);
    res.send(createResponse(data, "Payment made succesfully"))
  })
)

router.get(
  "/",
  authMiddleware,
  checkPermission([ROLE.USER]),
  validate("payment:get"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await PaymentService.getPayment(userId, req.query);
    res.send(createResponse(data, "Payment history fetched succesfully"))
  })
)

router.get(
  "/:id",
  authMiddleware,
  checkPermission([ROLE.USER]),
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const paymentId: string = req.params.id;
    const data = await PaymentService.getPaymentById(userId, paymentId);
    res.send(createResponse(data, "Payment detail fetched successfully"))
  })
)

export default router;