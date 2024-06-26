import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface ICard extends BaseSchema {
  cvv: string;
  provider: string,
  providerUserId: string,
  providerUserName: string,
  expireAt: Date,
  userId: Types.ObjectId,
  createdBy: Types.ObjectId, 
  updatedBy?: Types.ObjectId | null, 
  deletedBy?: Types.ObjectId | null, 
  card?: Types.ObjectId | null; 
  isDeleted: boolean;
  termsAgreed: boolean;
  allowSmsNotification: boolean;
  allowEmailNotification: boolean;
  status ?: string | null;
  deletedAt ?: Date ; 
}

const CardSchema = new Schema<ICard>(
  {
    cvv : {type : String, required: true } ,
    provider :  { type: String, required: true },
    providerUserId :  { type: String, required: true },
    providerUserName :  { type: String, required: true },
    expireAt : {type : Date, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    isDeleted : {type : Boolean , default : false} ,
    deletedAt : {type : Date},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },  
  },
  { timestamps: true }
);

export default mongoose.model<ICard>("card", CardSchema);
