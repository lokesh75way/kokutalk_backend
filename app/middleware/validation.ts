
import { type Response, type Request, type NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";
import mongoose from "mongoose";
import {
  sendOtp,
  checkOtp,
  updateName
} from "../helper/validations/user";
import { addContact, updateContact, getContact } from "../helper/validations/contact";
import { makeCall, updateCall } from "../helper/validations/call";

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
