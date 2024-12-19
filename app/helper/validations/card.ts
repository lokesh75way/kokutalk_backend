import { body, checkExact, query, param } from "express-validator";
import mongoose from "mongoose";

export const createCard = checkExact([
  body('expiry_month')
    .exists()
    .bail()
    .withMessage('Expiry month is required')
    .isInt({ min: 1, max: 12 })
    .withMessage('Expiry month must be a number between 1 and 12'),
  body('expiry_year')
    .exists()
    .bail()
    .withMessage('Expiry year is required')
    .isInt()
    .withMessage('Expiry year must be a number'),
  body('number')
    .exists()
    .bail()
    .withMessage('Number is required')
    .isString()
    .withMessage('Number must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Value must be provided for card number"),
  body('cvc')
    .exists()
    .bail()
    .withMessage('Cvc is required')
    .isString()
    .withMessage('Cvc must be a string')
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Value must be provided for card cvc"),
]);

export const addCard = checkExact([
    body('id')
      .exists()
      .bail()
      .withMessage('Card id is required')
      .isString()
      .withMessage('Card id must be a string')
      .trim()
      .notEmpty()
      .bail()
      .withMessage("Value must be provided for card id"),
]);

export const addPrimaryCard = checkExact([
    body('id')
      .exists()
      .bail()
      .withMessage('Card id is required')
      .isString()
      .withMessage('Card id must be a string')
      .trim()
      .notEmpty()
      .bail()
      .withMessage("Value must be provided for card id"),
]);

export const getCard = checkExact([
    query('pageIndex')
      .optional(),
    query('pageSize')
      .optional()
])