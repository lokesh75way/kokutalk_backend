import { body, checkExact } from "express-validator";

export const sendOtp = checkExact([
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

export const checkOtp = checkExact([
  body("otp")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("Otp is required")
    .isInt()
    .bail()
    .withMessage("Otp must be a number")
])

export const updateName = checkExact([
  body('name')
    .exists({ values: "falsy" })
    .withMessage('Name is required')
    .bail()
    .isString()
    .withMessage('Name must be a string')
    .bail(),
])