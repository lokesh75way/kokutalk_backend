import { body, query, checkExact } from "express-validator";

export const addContact = checkExact([
  body("firstName")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("First name is required")
    .isString()
    .bail()
    .withMessage("First name must be a string"),
  body("lastName")
    .optional()
    .isString()
    .bail()
    .withMessage("Last name must be a string"),
  body("phoneNumber")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("Phone number is required")
    .isString()
    .bail()
    .withMessage("Phone number must be a string")
    .matches(/\d{10}/)
    .bail()
    .withMessage("Phone number must be valid"),
  body("countryCode")
    .exists({ values: "falsy" })
    .withMessage("Country code is required")
    .bail()
    .isString()
    .withMessage("Country code must be a string")
    .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
    .bail()
    .withMessage("Country code must be valid"),
]);

export const updateContact = checkExact([
  body("firstName")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("First name is required")
    .isString()
    .bail()
    .withMessage("First name must be a string"),
  body("lastName")
    .optional()
    .isString()
    .bail()
    .withMessage("Last name must be a string"),
  body("phoneNumber")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("Phone number is required")
    .isString()
    .bail()
    .withMessage("Phone number must be a string")
    .matches(/\d{10}/)
    .bail()
    .withMessage("Phone number must be valid"),
  body("countryCode")
    .exists({ values: "falsy" })
    .withMessage("Country code is required")
    .bail()
    .isString()
    .withMessage("Country code must be a string")
    .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
    .bail()
    .withMessage("Country code must be valid"),
]);

export const getContact = checkExact([
  query("firstName")
    .optional()
    .isString()
    .bail()
    .withMessage("First name must be a string"),
  query("lastName")
    .optional()
    .isString()
    .bail()
    .withMessage("Last name must be a string"),
  query("phoneNumber")
    .optional()
    .isString()
    .bail()
    .withMessage("Phone number must be a string"),
  query("countryCode")
    .optional()
    .isString()
    .bail()
    .withMessage("Country code must be a string"),
  query("pageIndex").optional(),
  query("pageSize").optional(),
]);
