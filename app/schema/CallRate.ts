import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";
import { Currency } from "./Credit";

const Schema = mongoose.Schema;

export enum DurationUnit {
  MINUTE = "MINUTE",
  SECOND = "SECOND",
  HOUR = "HOUR"
}

export interface ICallRate extends BaseSchema {
  fromCountryCode: string,
  toCountryCode: string,
  fromCountryName: string,
  toCountryName: string,
  duration: number,
  durationUnit: string,
  price: number,
  tax: number,
  currency: string,
  isDeleted: boolean,
  status ?: string | null,
  deletedAt ?: Date,
  createdBy: Types.ObjectId, 
  updatedBy?: Types.ObjectId | null, 
  deletedBy?: Types.ObjectId | null,  
}

const CallRateSchema = new Schema<ICallRate>(
  {
    fromCountryCode : {type : String, required: true } ,
    toCountryCode :  { type: String, required: true },
    fromCountryName : {type : String, required: true },
    toCountryName : {type : String, required: true },
    status: { type: String },
    duration: { type: Number, required: true, default: 1 },
    durationUnit: { type: String, required: true, default: DurationUnit.MINUTE },
    price: { type: Number, required: true, default: 1 },
    tax: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: Currency.USD },
    isDeleted : {type : Boolean , default : false } ,
    deletedAt : {type : Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' }, 
  },
  { timestamps: true }
);

export default mongoose.model<ICallRate>("call_rate", CallRateSchema);

