import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface IUser extends BaseSchema {
  name? : string | null;
  phoneNumber: string,
  countryCode: string,
  otp?: Types.ObjectId | null;
  credit?: Types.ObjectId | null; 
  invitedBy?: Types.ObjectId | null; 
  contact: Types.ObjectId | null; 
  card?: Types.ObjectId | null; 
  isDeleted: boolean;
  termsAgreed: boolean;
  allowSmsNotification: boolean;
  allowEmailNotification: boolean;
  status ?: string | null;
  deletedAt ?: Date ;
  customerId?: string; 
}

const UserSchema = new Schema<IUser>(
  {
    name : {type : String } ,
    phoneNumber :  { type: String, required: true },
    countryCode :  { type: String, required: true },
    otp: { type: mongoose.Schema.Types.ObjectId, ref: 'otp' },
    status : {type : String} ,
    isDeleted : {type : Boolean, required: true, default : false} ,
    termsAgreed : {type : Boolean, required: true, default : true } ,
    allowSmsNotification : {type : Boolean, required: true, default : true } ,
    allowEmailNotification : {type : Boolean, required: true, default : true } ,
    deletedAt : {type : Date},
    credit: { type: mongoose.Schema.Types.ObjectId, ref: 'credit' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: 'contact', required: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'card' },
    customerId :  { type: String, default: "" },  
  },
  { timestamps: true }
);

UserSchema.index({ phoneNumber: 1, countryCode: 1, isDeleted: 1});

export default mongoose.model<IUser>("user", UserSchema);
