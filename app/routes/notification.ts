import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import * as notificationService from "../services/notification";
import { authMiddleware, ROLE } from "../middleware/auth";
import { checkPermission } from "../middleware/check-permission";

const router = express.Router();


router.put(
  "/:id",
  authMiddleware,
  checkPermission([ROLE.USER]),
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
  checkPermission([ROLE.USER, ROLE.ADMIN]),
  validate("notification:get"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    let userId =  req?.user?._id || "";
    const userRole = (req?.user as any)?.role || "";
    const userToSearch = (req.query.userId as string) || "";
    if(userRole ==ROLE.ADMIN) {
      userId = userToSearch ? userToSearch : "";
    }
    const data = await notificationService.getNotification(userId, req.query);
    res.send(createResponse(data, "Notification list fetched succesfully"))
  })
)

router.get(
  "/:id",
  authMiddleware,
  checkPermission([ROLE.USER, ROLE.ADMIN]),
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    let userId =  req?.user?._id || "";
    const userRole = (req?.user as any)?.role || "";
    const userToSearch = (req.query.userId as string) || "";
    if(userRole ==ROLE.ADMIN) {
      userId = userToSearch ? userToSearch : "";
    }
    const notificationId: string = req.params.id;
    const data = await notificationService.getNotificationById(userId, notificationId);
    res.send(createResponse(data, "Notification detail fetched successfully"))
  })
)

router.post(
  "/send",
  authMiddleware,
  checkPermission([ROLE.ADMIN]),
  validate("notification:send"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await notificationService.sendNotification(userId, req.body, req.body.customers || []);
    res.send(createResponse(data, "Notification sent succesfully"))
  })
)

export default router;