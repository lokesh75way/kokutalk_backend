import { body, query, checkExact } from "express-validator";

export const getCredit = checkExact([
    query('pageIndex')
      .optional(),
    query('pageSize')
      .optional()
      
])