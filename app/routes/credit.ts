import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import * as creditService from "../services/credit";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  validate("credit:get"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await creditService.getCredit(userId, req.query);
    res.send(createResponse(data, "Credit list fetched succesfully"))
  })
)

router.get(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const creditId: string = req.params.id;
    const data = await creditService.getCreditById(userId, creditId);
    res.send(createResponse(data, "Credit detail fetched successfully"))
  })
)

export default router;