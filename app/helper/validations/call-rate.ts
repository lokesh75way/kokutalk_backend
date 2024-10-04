import { body, query, checkExact } from "express-validator";

export const addCallRate = checkExact([
  body("price")
    .exists()
    .bail()
    .withMessage("Price is required")
    .isNumeric()
    .bail()
    .withMessage("Price must be a positive number")
    .custom((value) => {
        return value > 0;
    })
    .bail()
    .withMessage('Price must be a positive number'),
  body("tax")
    .optional()
    .isNumeric()
    .bail()
    .withMessage("Tax must be a non negative number")
    .custom((value) => {
        return value >= 0;
    })
    .bail()
    .withMessage('Tax must be a non negative number'),
  body("duration")
    .optional()
    .isNumeric()
    .bail()
    .withMessage("Duration must be a positive number")
    .custom((value) => {
        return value > 0;
    })
    .bail()
    .withMessage('Duration must be a positive number'),
  body("fromCountryName")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("From country name is required")
    .isString()
    .bail()
    .withMessage("From country name must be a string")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("From country name must have some value"),
  body("fromCountryCode")
    .exists({ values: "falsy" })
    .withMessage("From country code is required")
    .bail()
    .isString()
    .withMessage("From country code must be a string")
    .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
    .bail()
    .withMessage("From country code must be valid"),
  body("toCountryName")
    .exists({ values: "falsy" })
    .bail()
    .withMessage("To country name is required")
    .isString()
    .bail()
    .withMessage("To country name must be a string")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("To country name must have some value"),
  body("toCountryCode")
    .exists({ values: "falsy" })
    .withMessage("To country code is required")
    .bail()
    .isString()
    .withMessage("To country code must be a string")
    .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
    .bail()
    .withMessage("To country code must be valid"),
]);

export const updateCallRate = checkExact([
    body("price")
      .exists()
      .bail()
      .withMessage("Price is required")
      .isNumeric()
      .bail()
      .withMessage("Price must be a positive number")
      .custom((value) => {
          return value > 0;
      })
      .bail()
      .withMessage('Price must be a positive number'),
    body("tax")
      .optional()
      .isNumeric()
      .bail()
      .withMessage("Tax must be a non negative number")
      .custom((value) => {
          return value >= 0;
      })
      .bail()
      .withMessage('Tax must be a non negative number'),
    body("duration")
      .optional()
      .isNumeric()
      .bail()
      .withMessage("Duration must be a positive number")
      .custom((value) => {
          return value > 0;
      })
      .bail()
      .withMessage('Duration must be a positive number'),
    body("fromCountryName")
      .exists({ values: "falsy" })
      .bail()
      .withMessage("From country name is required")
      .isString()
      .bail()
      .withMessage("From country name must be a string")
      .trim()
      .notEmpty()
      .bail()
      .withMessage("From country name must have some value"),
    body("fromCountryCode")
      .exists({ values: "falsy" })
      .withMessage("From country code is required")
      .bail()
      .isString()
      .withMessage("From country code must be a string")
      .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
      .bail()
      .withMessage("From country code must be valid"),
    body("toCountryName")
      .exists({ values: "falsy" })
      .bail()
      .withMessage("To country name is required")
      .isString()
      .bail()
      .withMessage("To country name must be a string")
      .trim()
      .notEmpty()
      .bail()
      .withMessage("To country name must have some value"),
    body("toCountryCode")
      .exists({ values: "falsy" })
      .withMessage("To country code is required")
      .bail()
      .isString()
      .withMessage("To country code must be a string")
      .matches(/^\+(\d{1}\-)?(\d{1,3})$/)
      .bail()
      .withMessage("To country code must be valid"),
  ]);

export const getCallRate = checkExact([
  query("fromCountryCode")
    .optional()
    .isString()
    .bail()
    .withMessage("From country code must be a string"),
  query("fromCountryName")
    .optional()
    .isString()
    .bail()
    .withMessage("From country name must be a string"),
  query("toCountryCode")
    .optional()
    .isString()
    .bail()
    .withMessage("To country code must be a string"),
  query("toCountryName")
    .optional()
    .isString()
    .bail()
    .withMessage("To country name must be a string"),
  query("pageIndex").optional(),
  query("pageSize").optional(),
]);