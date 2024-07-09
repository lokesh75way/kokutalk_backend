import { body, query, checkExact } from "express-validator";

export const getNotification = checkExact([
    query('entityType')
      .optional()
      .isString()
      .bail()
      .withMessage('Entity type must be a string'),
    query('entityTypeId')
      .optional()
      .isString()
      .bail()
      .withMessage('Entity type id must be a string'),
    query('isSeen')
      .optional()
      .isBoolean()
      .bail()
      .withMessage('Phone number must be a boolean'),
    query('message')
      .optional()
      .isString()
      .bail()
      .withMessage('Message must be a string'),
    query('pageIndex')
      .optional(),
    query('pageSize')
      .optional()
      
])