import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate,  validateIdParam} from "../middleware/validation";
import * as CardService from "../services/card";
import { authMiddleware } from "../middleware/auth";
import { checkPermission } from "../middleware/check-permission";
import { ROLE } from "../middleware/auth";

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    checkPermission([ROLE.USER]),
    validate("card:add"),
    catchError,
    expressAsyncHandler(async (req, res) => {
      const userId =  req?.user?._id || "";
      const data = await CardService.addCard(userId, req.body);
      res.send(createResponse(data, "Card added successfully"));
    })
)

router.post(
    "/primary",
    authMiddleware,
    checkPermission([ROLE.USER]),
    validate("card:add-primary"),
    catchError,
    expressAsyncHandler(async (req, res) => {
      const userId =  req?.user?._id || "";
      const data = await CardService.addPrimaryCard(userId, req.body);
      res.send(createResponse(data, "Primary card added successfully"));
    })
)

router.get(
    "/",
    authMiddleware,
    checkPermission([ROLE.USER]),
    validate("card:get"),
    catchError,
    expressAsyncHandler(async (req, res) => {
      const userId =  req?.user?._id || "";
      const data = await CardService.getCard(userId, req.query);
      res.send(createResponse(data, "Card list fetched successfully"));
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
      const cardId = req.params.id;
      const data = await CardService.getCardById(userId, cardId);
      res.send(createResponse(data, "Card detail fetched successfully"));
    })
)

router.delete(
    "/:id",
    authMiddleware,
    checkPermission([ROLE.USER]),
    validateIdParam("id"),
    catchError,
    expressAsyncHandler(async (req, res) => {
      const userId =  req?.user?._id || "";
      const cardId = req.params.id;
      const data = await CardService.deleteCard(userId, cardId);
      res.send(createResponse(data, "Card deleted successfully"));
    })
)

export default router;