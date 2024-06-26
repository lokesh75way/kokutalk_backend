import { body, check, checkExact } from "express-validator";

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