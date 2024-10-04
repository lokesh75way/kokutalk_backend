
import { type Response, type Request, type NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import {
  sendOtp,
  checkOtp,
  updateName,
  addNumber,
  getNumber
} from "../helper/validations/user";
import { addContact, updateContact, getContact } from "../helper/validations/contact";
import { makeCall, updateCall } from "../helper/validations/call";
import { getNotification } from "../helper/validations/notification";
import { getCredit } from "../helper/validations/credit";
import { adminRegister, adminLogin } from "../helper/validations/admin";
import { addCallRate, updateCallRate, getCallRate } from "../helper/validations/call-rate";
import { addPayment, getPayment } from "../helper/validations/payment";

export const validate = (validationName: string): any[] => {
  switch (validationName) {
    case "user:send-otp": {
      return [sendOtp]
    }
    case "user:verify-otp" : {
      return [checkOtp];
    }
    case "user:update-name" : {
      return [updateName] ;
    }
    case "user:add-number" : {
      return [addNumber] ;
    }
    case "user:get-number" : {
      return [getNumber] ;
    }
    case "contact:add": {
      return [addContact];
    }
    case "contact:update": {
      return [updateContact];
    }
    case "contact:get": {
      return [getContact];
    }
    case "call:add": {
      return [makeCall];
    }
    case "call:update": {
      return [updateCall];
    }
    case "notification:get": {
      return [getNotification];
    }
    case "credit:get": {
      return [getCredit];
    }
    case "admin:register": {
      return [adminRegister]
    }
    case "admin:login": {
      return [adminLogin]
    }
    case "call-rate:add": {
      return [addCallRate];
    }
    case "call-rate:update": {
      return [updateCallRate];
    }
    case "call-rate:get": {
      return [getCallRate];
    }
    case "payment:add": {
      return [addPayment];
    }
    case "payment:get": {
      return [getPayment];
    }
    
    default:
      return [];
  }
};

export const validateIdParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!mongoose.isObjectIdOrHexString(id)) {
      throw createHttpError(400, `Invalid ${paramName}`);
    }
    next();
  };
}

export const catchError = expressAsyncHandler(
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    const isError = errors.isEmpty();
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!isError) {
      const data = { errors: errors.array() };
      throw createHttpError(400, {
        message: "Validation error!",
        data,
      });
    } else {
      next();
    }
  }
);
