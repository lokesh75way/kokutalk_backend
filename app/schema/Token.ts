import mongoose, { ObjectId } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export enum TokenType {
    PasswordReset = "password_reset",
    OtpVerification = "otp_verification",
    Access = "access"
}

export interface IToken extends BaseSchema {
  value: string;
  expireAt : Date,  
  useLimit : number,
  useCount : number,
  lastUseAt : Date,
  adminId?: ObjectId | null,
  userId?: ObjectId | null,
  refreshToken?: string,
  type: string
}

const TokenSchema = new Schema<IToken>(
  {
    value : {type : String ,required:true } ,
    expireAt : { type : Date ,required:true } ,
    useLimit : { type : Number , default : 1 } ,
    useCount : { type : Number ,default : 0 } ,
    lastUseAt : { type : Date } ,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', default: null },
    refreshToken: { type: String, default: "" },
    type: { type: String, enum: Object.values(TokenType), default: TokenType.Access }
  },
  { timestamps: true }
);

export default mongoose.model<IToken>("token", TokenSchema);