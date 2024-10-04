import { body, query, checkExact } from "express-validator";
import { CURRENCY } from "../../schema/Payment";

export const addPayment = checkExact([
  body("amount")
    .exists()
    .bail()
    .withMessage("Amount is required")
    .isNumeric()
    .bail()
    .withMessage("Amount must be a positive number")
    .custom((value) => {
        return value > 0;
    })
    .bail()
    .withMessage('Amount must be a positive number'),
  body("currency")
    .optional()
    .isString()
    .bail()
    .withMessage("Currency must be a string")
    .isIn(Object.values(CURRENCY))
    .bail()
    .withMessage(`Currency must be one of the values in ${Object.values(CURRENCY)}`),
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
]);