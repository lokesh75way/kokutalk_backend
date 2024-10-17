import { body, check, checkExact, query } from "express-validator";
import mongoose from "mongoose";

export const makeCall = checkExact([
  body('phoneNumber')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Phone number is required')
    .isString()
    .bail()
    .withMessage('Phone number must be a string')
    .matches(/\d{10}/)
    .bail().withMessage('Phone number must be valid'),
  body('countryCode')
    .exists({ values: "falsy" })
    .withMessage('Country code is required')
    .bail()
    .isString()
    .withMessage('Country code must be a string')
    .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
    .bail().withMessage('Country code must be valid'),
])

export const updateCall = 
    check('CallSid')
      .exists({ values: "falsy" })
      .bail()
      .withMessage('Call sid is required')
      .isString()
      .bail()
      .withMessage('Call sid must be a string')

export const getCall = checkExact([
  query("pageIndex").optional(),
  query("pageSize").optional(),
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
  query("firstName").optional()
    .isString()
    .bail()
    .withMessage("First name must be a string"),
  query("lastName").optional()
    .isString()
    .bail()
    .withMessage("Last name must be a string"),
  query("phoneNumber").optional()
    .isString()
    .bail()
    .withMessage("Phone number must be a string"),
  query("countryCode").optional()
    .isString()
    .bail()
    .withMessage("Country code must be a string"),
]);