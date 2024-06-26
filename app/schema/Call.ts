import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";
import { Currency } from "./Credit";
import { DurationUnit } from "./CallRate";

const Schema = mongoose.Schema;

export enum Provider {
  TWILIO = "TWILIO"
}

export interface IProvider {
  name: string;
  duration: number;
  durationUnit: string;
  price: number;
  currency: string;
  tax: number;
}

export const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true, default: Provider.TWILIO },
    duration: { type: Number, required: true, default: 1 },
    durationUnit: { type: String, required: true, default: DurationUnit.MINUTE },
    price: { type: Number, required: true, default: 1 },
    currency: { type: String, required: true, default: Currency.USD },
    tax: { type: Number, required: true, default: 0 }
  }
);

export interface IContactDetail {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  countryCode: string;
  status?: string | null;
  sid?: string | null;
  userId?: Types.ObjectId | null,
  userName?: string | null;
}

export const ContactDetailSchema = new Schema<IContactDetail>(
  {
    firstName : {type : String } ,
    lastName :  { type: String },
    phoneNumber : {type : String, required: true },
    countryCode : {type : String, required: true },
    status: { type: String },
    sid: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    userName: { type: String }
  }
);

export interface ICallRateDetail {
  duration: number;
  durationUnit: string;
  price: number;
  tax: number;
  currency: string;
}

export const CallRateDetailSchema = new Schema<ICallRateDetail>(
  {
    duration: { type: Number, required: true, default: 1 },
    durationUnit: { type: String, required: true, default: DurationUnit.MINUTE },
    price: { type: Number, required: true, default: 1 },
    tax: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: Currency.USD },
  }
);

export interface ICall extends BaseSchema {
  callRate?: Types.ObjectId | null,
  callRateDetail?: ICallRateDetail,
  caller: Types.ObjectId,
  receiver: Types.ObjectId,
  callerDetail: IContactDetail,
  receiverDetail: IContactDetail
  startedAt?: Date,
  endedAt?: Date,
  isDeletedByCaller: boolean,
  isDeletedByReceiver: boolean,
  status?: string | null,
  sid?: string | null,
  deletedByCallerAt ?: Date,
  deletedByReceiverAt ?: Date,
  creditUsed: Types.ObjectId,
  creditAmountUsed: number,
  providerCallRate: IProvider,
  providerTotalPrice: number,
}

const CallSchema = new Schema<ICall>(
  {
    status: { type: String },
    callRate: { type: mongoose.Schema.Types.ObjectId, ref: 'call_rate' },
    callRateDetail: { type: CallRateDetailSchema },
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'contact', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'contact', required: true },
    callerDetail: { type: ContactDetailSchema },
    receiverDetail: { type: ContactDetailSchema },
    sid: { type: String },
    startedAt : {type : Date },
    endedAt : {type : Date },
    deletedByCallerAt : {type : Date },
    deletedByReceiverAt : {type : Date },
    isDeletedByCaller : {type : Boolean , required: true, default : false },
    isDeletedByReceiver : {type : Boolean , required: true, default : false } ,
    creditUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'credit', required: true },
    creditAmountUsed: { type: Number, required: true, default: 0 },
    providerCallRate: { type: ProviderSchema },
    providerTotalPrice: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICall>("call", CallSchema);
