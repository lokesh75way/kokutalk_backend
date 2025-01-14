import createHttpError from "http-errors";
import Payment, { CURRENCY, IPayment, PaymentService, PaymentStatus, PaymentTransactionStatus, PaymentType } from "../schema/Payment";
import { addCredit } from "./credit";
import { parsePagination, parsePayload } from "../helper/common";
import { saveNotification } from "./notification";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { getUserById } from "./user";
import Card from "../schema/Card";
import { createPaymentIntent } from "../helper/stripe";

interface PaymentPayload {
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
    userId?: string | null;
    from?: string | null;
    to?: string | null;
}

interface PaymentAddPayload {
    amount: number;
    currency: CURRENCY.USD;
    card?: string | null;
    servicePaymentId?: string | null;
    servicePaymentStatus?: PaymentTransactionStatus.SUCCESS | PaymentTransactionStatus.FAILED;
}

export const addPayment = async (userId: string, data: PaymentAddPayload) => {
    try {
        const userDetail = await getUserById(userId);
        const { card = userDetail?.card } = data;
        if(!userDetail?.customerId || !card) {
          throw createHttpError(400, "No card added for logged in user.");
        }

        const cardDetail = await Card.findOne({ userId, _id: card, isDeleted: false });
        if(!cardDetail?._id) {
           throw createHttpError(400, "Card detail not found for logged in user.");
        }

        const  creditPayment = { amount: data.amount*100, currency: 'usd', 
            confirm: true, customer: userDetail?.customerId,
            description: "Credit Add",
            payment_method: cardDetail?.cardId,
            error_on_requires_action: false,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never"
            }
        }
        const creditPaymentTransaction = await createPaymentIntent(creditPayment); 
        if((creditPaymentTransaction?.amount_received != creditPayment?.amount) || 
        (creditPaymentTransaction?.status != PaymentStatus.SUCCEEDED)
        ) {
           throw createHttpError(400, "Payment can't be made due to transaction completion error.");
        }
          
        const payment = await Payment.create({
            ...data,
            amount: creditPaymentTransaction?.amount_received/100,
            currency: CURRENCY.USD,
            status: PaymentTransactionStatus.SUCCESS,
            type: PaymentType.ADD,
            description: "Credit Add",
            serviceUsed: PaymentService.STRIPE,
            servicePaymentId: creditPaymentTransaction?.id,
            servicePaymentStatus: PaymentStatus.SUCCEEDED,
            card: cardDetail?._id,
            userId, createdBy: userId
        })
        await addCredit(userId, { totalAmount: data.amount, remainingAmount: data.amount, currency: data.currency || CURRENCY.USD });
        await saveNotification(userId, { entityType: "payments", entityTypeId: payment?._id?.toString(),
            title: "Recharge successful",
            message: `Payment successfully made for ${payment.amount} ${payment.currency}`
        })
        return { payment };

    } catch (error:any) {
        throw createHttpError(error?.status || 500, { message: error?.message || "Something went wrong in making payment." });
    }
};

export const getPayment = async (userId: string, payload: PaymentPayload) => {
    try {
        const pageFields = [{field: "pageIndex", defaultValue: 1}, {field: "pageSize", defaultValue: 10}]
        const { pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch } = parsePagination(JSON.stringify(payload), pageFields)
        const skipedPayment = (pageIndexToSearch - 1)*pageSizeToSearch;

        const paymentSearch:any = { 
            isDeleted: false
        }
        if(mongoose.isObjectIdOrHexString(userId)) {
            paymentSearch["userId"] = userId;
        }

        const dateSearch: any = { };

        if(payload.from) {
            const startDateTime = moment(payload.from).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).format();
            dateSearch["createdAt"] = { $gte: startDateTime };
        }
      
        if(payload.to) {
            const endDateTime = moment(payload.to).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).format();
            dateSearch["createdAt"] = { ...dateSearch["createdAt"], $lte: endDateTime };
        }

        const paymentCount = await Payment.find({...paymentSearch, ...dateSearch }).countDocuments();
        const payments = await Payment.find({...paymentSearch, ...dateSearch }).sort({ createdAt: -1 }).skip(skipedPayment).limit(pageSizeToSearch)
        .populate("userId", "-otp").lean().exec();

        return { payments, totalCount: paymentCount, pageCount: Math.ceil(paymentCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: payments.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching payment list." });
    }
    
};

export const getPaymentById = async (userId: string, paymentId: string) => {
    try {
        const paymentSearch:any = { 
            isDeleted: false, 
            _id: paymentId
        }
        if(mongoose.isObjectIdOrHexString(userId)) {
            paymentSearch["userId"] = userId;
        }
        const payment = await Payment.findOne(paymentSearch).populate("userId", "-otp").lean().exec();
        if(!payment?._id) {
            throw createHttpError(400, { message: "Payment is either deleted or doesn't exist." });
        }
        return { payment };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching payment by id." });
    }
};