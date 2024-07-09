import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface INotification extends BaseSchema {
  entityType?: string,
  entityTypeId?: string,
  isSeen: boolean,
  seenAt: Date,
  userId: Types.ObjectId,
  status ?: string | null,
  message?: string,
  isDeleted: boolean,
  deletedAt ?: Date, 
}

const NotificationSchema = new Schema<INotification>(
  {
    entityType : {type : String, required: true, default: "" } ,
    entityTypeId :  { type: String, required: true, default: "" },
    isSeen : {type : Boolean , required: true, default : false } ,
    seenAt : {type : Date },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: false },
    status: { type: String },
    message: { type: String },
    isDeleted : {type : Boolean , required: true, default : false },
    deletedAt : {type : Date }
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("notification", NotificationSchema);