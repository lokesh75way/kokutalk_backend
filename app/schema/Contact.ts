import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface IContact extends BaseSchema {
  firstName?: string,
  lastName?: string,
  phoneNumber: string,
  countryCode: string,
  createdBy: Types.ObjectId,
  updatedBy?: Types.ObjectId | null,
  deletedBy?: Types.ObjectId | null,
  userId?: Types.ObjectId | null,
  isDeleted: boolean,
  status?: string | null,
  sid?: string | null,
  deletedAt ?: Date, 
}

const ContactSchema = new Schema<IContact>(
  {
    firstName : {type : String } ,
    lastName :  { type: String },
    phoneNumber : {type : String, required: true },
    countryCode : {type : String, required: true },
    status: { type: String },
    sid: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    isDeleted : {type : Boolean , required: true, default : false } ,
    deletedAt : {type : Date } 
  },
  { timestamps: true }
);

export default mongoose.model<IContact>("contact", ContactSchema);
