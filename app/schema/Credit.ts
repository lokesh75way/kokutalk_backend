import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export enum Currency {
  USD = "USD",
  INR = "INR",
}

export enum Service {
  PAYPAL = "PAYPAL",
}

export interface ICredit extends BaseSchema {
  totalAmount: number,
  remainingAmount: number,
  expireAt: Date,
  usedBy: Types.ObjectId,
  sentBy?: Types.ObjectId | null, 
  service: string,
  serviceUserId: string, 
  currency: string,
  isDeleted: boolean,
  status ?: string | null,
  deletedAt ?: Date, 
}

const CreditSchema = new Schema<ICredit>(
  {
    totalAmount : {type : Number, required: true, default: 0 } ,
    remainingAmount :  { type: Number, required: true, default: 0 },
    expireAt : {type : Date, required: true },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    status: { type: String },
    service: { type: String, required: true, default: Service.PAYPAL },
    serviceUserId: { type: String, required: true },
    currency: { type: String, required: true, default: Currency.USD },
    isDeleted : {type : Boolean , required: true, default : false } ,
    deletedAt : {type : Date } 
  },
  { timestamps: true }
);

export default mongoose.model<ICredit>("credit", CreditSchema);

