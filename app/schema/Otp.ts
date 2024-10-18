import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface IOtp extends BaseSchema {
  value: number;
  expireAt : Date,  
  useLimit : number,
  useCount : number,
  lastUseAt : Date,
  userId?: Types.ObjectId | null;
}

const OtpSchema = new Schema<IOtp>(
  {
    value : {type : Number ,required:true } ,
    expireAt : { type : Date ,required:true } ,
    useLimit : { type : Number , default : 1 } ,
    useCount : { type : Number ,default : 0 } ,
    lastUseAt : { type : Date } ,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null }
  },
  { timestamps: true }
);

export default mongoose.model<IOtp>("otp", OtpSchema);
