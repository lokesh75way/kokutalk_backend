import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";
import { hashPassword } from "../services/admin";

const Schema = mongoose.Schema;

export interface IAdmin extends BaseSchema {
  name : string | null;
  phoneNumber: string,
  countryCode: string,
  email: string,
  password: string,
  passwordResetOtp?: Types.ObjectId | null; 
  isDeleted: boolean;
  termsAgreed: boolean;
  allowSmsNotification: boolean;
  allowEmailNotification: boolean;
  status ?: string | null;
  deletedAt ?: Date ; 
}

const AdminSchema = new Schema<IAdmin>(
  {
    name : {type : String } ,
    phoneNumber :  { type: String, default: "" },
    countryCode :  { type: String, default: "" },
    email :  { type: String, required: true },
    password :  { type: String, required: true },
    passwordResetOtp: { type: mongoose.Schema.Types.ObjectId, ref: 'otp', default: null },
    status : {type : String} ,
    isDeleted : {type : Boolean, required: true, default : false} ,
    termsAgreed : {type : Boolean, required: true, default : true } ,
    allowSmsNotification : {type : Boolean, required: true, default : true } ,
    allowEmailNotification : {type : Boolean, required: true, default : true } ,
    deletedAt : {type : Date}
  },
  { timestamps: true }
);

AdminSchema.pre("save", async function (next) {
  if (this.password) {
    this.password = await hashPassword(this.password);
  }
  next();
});

AdminSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as { password?: string; $set?: { password?: string } };
  if (update?.password) {
    update.password = await hashPassword(update.password);
  } else if (update?.$set && update?.$set?.password) {
    update.$set.password = await hashPassword(update.$set.password);
  }
  next();
});

export default mongoose.model<IAdmin>("admin", AdminSchema);