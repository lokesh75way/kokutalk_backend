import createHttpError from "http-errors";
import Payment, { CURRENCY, IPayment } from "../schema/Payment";
import { addCredit } from "./credit";
import { parsePagination, parsePayload } from "../helper/common";
import { saveNotification } from "./notification";

interface PaymentPayload {
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
}

export const addPayment = async (userId: string, data: Partial<IPayment>) => {
    try { 
      const payment = await Payment.create({...data, userId, createdBy: userId });
      await addCredit(userId, { totalAmount: data.amount, remainingAmount: data.amount, currency: data.currency || CURRENCY.USD });
      await saveNotification(userId, { entityType: "payments", entityTypeId: payment?._id?.toString(),
        message: `Payment successfully made for ${payment.amount} ${payment.currency}`
       })
      return { payment };

    } catch (error) {
        throw createHttpError(500, { message: "Something went wrong in making payment." });
    }
};

export const getPayment = async (userId: string, payload: PaymentPayload) => {
    try {
        const pageFields = [{field: "pageIndex", defaultValue: 1}, {field: "pageSize", defaultValue: 10}]
        const { pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch } = parsePagination(JSON.stringify(payload), pageFields)
        const skipedPayment = (pageIndexToSearch - 1)*pageSizeToSearch;

        const paymentSearch:any = { 
            userId, isDeleted: false
        }

        const paymentCount = await Payment.find(paymentSearch).countDocuments();
        const payments = await Payment.find(paymentSearch).sort({ createdAt: -1 }).skip(skipedPayment).limit(pageSizeToSearch).lean().exec();

        return { payments, totalCount: paymentCount, pageCount: Math.ceil(paymentCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: payments.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching payment list." });
    }
    
};

export const getPaymentById = async (userId: string, paymentId: string) => {
    try {
        const paymentSearch = { 
            userId, isDeleted: false, 
            _id: paymentId
        }
        const payment = await Payment.findOne(paymentSearch).lean().exec();
        if(!payment?._id) {
            throw createHttpError(400, { message: "Payment is either deleted or doesn't exist." });
        }
        return { payment };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching payment by id." });
    }
};