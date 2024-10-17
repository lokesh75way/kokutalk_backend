import { body, checkExact, query } from "express-validator";
import mongoose from "mongoose";

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

export const adminUpdate = checkExact([
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
  body('profileImage')
    .optional()
    .isString()
    .bail()
    .withMessage('Profile image must be a string'),
])

export const adminChangePassword = checkExact([
  body('oldPassword')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Old password is required')
    .isString()
    .bail()
    .withMessage('Old password must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage('Old password must have some value'),
  body('newPassword')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('New password is required')
    .isString()
    .bail()
    .withMessage('New password must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage('New password must have some value'),
])

export const adminForgotPassword = checkExact([
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
])

export const adminResetPassword = checkExact([
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
  body('otp')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Otp is required')
    .isString()
    .bail()
    .withMessage('Otp must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage('Otp must have some value'),
])

export const adminVerifyOtp = checkExact([
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
  body('otp')
    .exists({ values: "falsy" })
    .bail()
    .withMessage('Otp is required')
    .isString()
    .bail()
    .withMessage('Otp must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage('Otp must have some value'),
])

export const adminDashboard = checkExact([
  query("pageIndex").optional(),
  query("pageSize").optional(),
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
]);

export const getCustomer = checkExact([
  query("pageIndex").optional(),
  query("pageSize").optional(),
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