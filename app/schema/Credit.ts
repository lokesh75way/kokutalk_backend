import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";
import { CURRENCY } from "./Payment";

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
  expireAt?: Date | null,
  usedBy: Types.ObjectId,
  sentBy?: Types.ObjectId | null,
  currency: string,
  isDeleted: boolean,
  status ?: string | null,
  deletedAt ?: Date, 
}

const CreditSchema = new Schema<ICredit>(
  {
    totalAmount : {type : Number, required: true, default: 0 } ,
    remainingAmount :  { type: Number, required: true, default: 0 },
    expireAt : {type : Date, default: null },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    status: { type: String },
    currency: { type: String, required: true, enum: Object.values(CURRENCY), default: Currency.USD },
    isDeleted : {type : Boolean , required: true, default : false } ,
    deletedAt : {type : Date } 
  },
  { timestamps: true }
);

export default mongoose.model<ICredit>("credit", CreditSchema);

