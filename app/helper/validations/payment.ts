import { body, query, checkExact } from "express-validator";
import { CURRENCY } from "../../schema/Payment";
import mongoose from "mongoose";

const allowedCurrency = [CURRENCY.USD];

export const addPayment = checkExact([
  body("amount")
    .exists()
    .bail()
    .withMessage("Amount is required")
    .isNumeric()
    .bail()
    .withMessage("Amount must be a positive number")
    .custom((value) => {
        return value >=1;
    })
    .bail()
    .withMessage('Amount must be greater than or equal to 1'),
  body("currency")
    .optional()
    .isString()
    .bail()
    .withMessage("Currency must be a string")
    .isIn(Object.values(allowedCurrency))
    .bail()
    .withMessage(`Currency must be one of the values in ${allowedCurrency}`),
  body("card")
    .optional()
    .isString()
    .bail()
    .withMessage("Card id must be a string")
    .custom((value) => {
      return mongoose.isObjectIdOrHexString(value);
    })
    .bail()
    .withMessage("Invalid card Id"),
  body("servicePaymentId")
    .optional()
    .isString()
    .bail()
    .withMessage("Service payment id must be a string"),
  body("servicePaymentStatus")
    .optional()
    .isString()
    .bail()
    .withMessage("Service payment status must be a string")   
]);

export const getPayment = checkExact([
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
]);