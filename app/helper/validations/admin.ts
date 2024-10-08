import { body, checkExact } from "express-validator";

export const adminRegister = checkExact([
  body('name')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Name is required')
    .isString()
    .bail()
    .withMessage('Name must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage('Name must have some value'),
  body('email')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Email is required')
    .isString()
    .bail()
    .withMessage('Email must be a string')
    .isEmail()
    .bail()
    .withMessage('Email must be valid'),
  body('password')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Password is required')
    .isString()
    .bail()
    .withMessage('Password must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage('Password must have some value'),
])

export const adminLogin = checkExact([
    body('email')
      .exists({ values: "falsy" })
      .bail()
      .withMessage('Email is required')
      .isString()
      .bail()
      .withMessage('Email must be a string')
      .isEmail()
      .bail()
      .withMessage('Email must be valid'),
    body('password')
      .exists({ values: "falsy" })
      .bail()
      .withMessage('Password is required')
      .isString()
      .bail()
      .withMessage('Password must be a string')
      .trim()
      .notEmpty()
      .bail()
      .withMessage('Password must have some value'),
])