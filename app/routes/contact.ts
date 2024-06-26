import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate, validateIdParam } from "../middleware/validation";
import * as ContactService from "../services/contact";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validate("contact:add"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await ContactService.addContact(userId, req.body);
    res.send(createResponse(data, "Contact added succesfully"))
  })
)

router.put(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  validate("contact:update"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const contactId: string = req.params.id;
    const data = await ContactService.updateContact(userId, contactId, req.body);
    res.send(createResponse(data, "Contact updated succesfully"))
  })
)

router.get(
  "/",
  authMiddleware,
  validate("contact:get"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const data = await ContactService.getContact(userId, req.query);
    res.send(createResponse(data, "Contact list fetched succesfully"))
  })
)

router.get(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const contactId: string = req.params.id;
    const data = await ContactService.getContactById(userId, contactId);
    res.send(createResponse(data, "Contact detail fetched successfully"))
  })
)

router.delete(
  "/:id",
  authMiddleware,
  validateIdParam("id"),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const userId =  req?.user?._id || "";
    const contactId: string = req.params.id;
    const data = await ContactService.deleteContact(userId, contactId);
    res.send(createResponse(data, "Contact deleted successfully"))
  })
)

export default router;
