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
  sentBy?: Types.ObjectId | null, 
}

const NotificationSchema = new Schema<INotification>(
  {
    entityType : {type : String, default: "" } ,
    entityTypeId :  { type: String, default: "" },
    isSeen : {type : Boolean , required: true, default : false } ,
    seenAt : {type : Date },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: false },
    status: { type: String },
    message: { type: String },
    isDeleted : {type : Boolean , required: true, default : false },
    deletedAt : {type : Date },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', default: null }

  },
  { timestamps: true }
);

export default mongoose.model<INotification>("notification", NotificationSchema);