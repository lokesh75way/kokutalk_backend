import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface ICard extends BaseSchema {
  cardId: string;
  userId: Types.ObjectId | null;
  status?: string | null;
  createdBy: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  deletedBy?: Types.ObjectId | null;
  deletedAt?: Date | null;
  isVerified: boolean 
}

const CardSchema = new Schema<ICard>(
  {
    cardId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    isDeleted: { type: Boolean, required: true, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    deletedAt: { type: Date, default: null },
    isVerified: { type: Boolean, required: true, default: false },  
  },
  { timestamps: true }
);

export default mongoose.model<ICard>("card", CardSchema);
