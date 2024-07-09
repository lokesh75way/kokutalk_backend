import { body, checkExact, query } from "express-validator";

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
    .bail()
    .withMessage('Country code is required')
    .isString()
    .bail()
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
    .bail()
    .withMessage('Name is required')
    .isString()
    .bail()
    .withMessage('Name must be a string'),
])

export const addNumber = checkExact([
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
  body('isPrimary')
    .optional()
    .isBoolean()
    .withMessage('Is primary must be a boolean'),
])

export const getNumber = checkExact([
  query('firstName')
    .optional()
    .isString()
    .bail()
    .withMessage('First name must be a string'),
  query('lastName')
    .optional()
    .isString()
    .bail()
    .withMessage('Last name must be a string'),
  query('phoneNumber')
    .optional()
    .isString()
    .bail()
    .withMessage('Phone number must be a string'),
  query('countryCode')
    .optional()
    .isString()
    .bail()
    .withMessage('Country code must be a string'),
  query('pageIndex')
    .optional(),
  query('pageSize')
    .optional()
    
])