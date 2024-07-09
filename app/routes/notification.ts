import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import * as notificationService from "../services/notification";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();


router.put(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const notificationId: string = req.params.id;
    const data = await notificationService.updateNotification(userId, notificationId, req.body);
    res.send(createResponse(data, "Notification updated succesfully"))
  })
)

router.get(
  "/",
  authMiddleware,
  validate("notification:get"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await notificationService.getNotification(userId, req.query);
    res.send(createResponse(data, "Notification list fetched succesfully"))
  })
)

router.get(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const notificationId: string = req.params.id;
    const data = await notificationService.getNotificationById(userId, notificationId);
    res.send(createResponse(data, "Notification detail fetched successfully"))
  })
)

export default router;