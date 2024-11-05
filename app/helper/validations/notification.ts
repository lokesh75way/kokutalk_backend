import { body, query, checkExact } from "express-validator";
import mongoose from "mongoose";

export const getNotification = checkExact([
    query('entityType')
      .optional()
      .isString()
      .bail()
      .withMessage('Entity type must be a string'),
    query('entityTypeId')
      .optional()
      .isString()
      .bail()
      .withMessage('Entity type id must be a string'),
    query('isSeen')
      .optional()
      .isBoolean()
      .bail()
      .withMessage('Phone number must be a boolean'),
    query('message')
      .optional()
      .isString()
      .bail()
      .withMessage('Message must be a string'),
    query('pageIndex')
      .optional(),
    query('pageSize')
      .optional(),
    query("userId")
      .optional()
      .custom((value) => {
        return mongoose.isObjectIdOrHexString(value);
      })
      .bail()
      .withMessage("Invalid user Id"),
    query("from")
      .optional()
      .isDate({format: "yyyy-mm-dd"})
      .bail()
      .withMessage("From must be a date in yyyy-mm-dd format"),
    query("to")
      .optional()
      .isDate({format: "yyyy-mm-dd"})
      .bail()
      .withMessage("To must be a date in yyyy-mm-dd format"),
      
])

export const sendNotification = checkExact([
  body('message')
    .exists()
    .bail()
    .withMessage("Message is required")
    .isString()
    .bail()
    .withMessage('Message must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Message must have some value"),
  body('entityType')
    .optional()
    .isString()
    .bail()
    .withMessage('Entity type must be a string'),
  body('customers')
    .optional()
    .isArray()
    .bail()
    .withMessage("Customer ids must be an array"),
  body('customers.*')
    .optional()
    .isString()
    .bail()
    .withMessage("Customer id entry be a string")
    .custom((value) => {
      return mongoose.isObjectIdOrHexString(value)
    })
    .bail()
    .withMessage("Invalid customer id entry") 
])