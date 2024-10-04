import mongoose, { Types } from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export enum PaymentType {
  ADD = "ADD",
  USED = "USED"
}

export enum PaymentTransactionStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED"
}

export enum CURRENCY {
  INR = "INR",
  USD = "USD"
}

export enum PaymentStatus {
    CANCELED = "canceled",
    PROCESSING = "processing",
    REQUIRES_ACTION = "requires_action",
    REQUIRES_CAPTURE = "requires_capture",
    REQUIRES_CONFIRMATION = "requires_confirmation",
    REQUIRES_PAYMENT_METHOD = "requires_payment_method",
    SUCCEEDED = "succeeded"
}

export enum PaymentService {
    PAYPAL = "paypal"
}

export interface IPayment extends BaseSchema {
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentTransactionStatus;
  description?: string;
  isDeleted?: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
  game?: Types.ObjectId | null;
  userGame?: Types.ObjectId | null;
  serviceUsed: string;
  servicePaymentId: string;
  servicePaymentStatus: string;
  servicePaymentStatusUpdatedAt: Date;
  card: string
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: Object.values(CURRENCY), default: CURRENCY.USD },
    type: { type: String, enum: Object.values(PaymentType), default: PaymentType.ADD },
    status: { type: String, enum: Object.values(PaymentTransactionStatus), default: PaymentTransactionStatus.SUCCESS },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    deletedAt: { type: Date },
    servicePaymentId: { type: String, default: "" },
    servicePaymentStatus: { type: String, default: PaymentStatus.SUCCEEDED },
    servicePaymentStatusUpdatedAt: { type: Date },
    serviceUsed: { type: String, enum: Object.values(PaymentService), default: PaymentService.PAYPAL },
    card: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("payment", PaymentSchema);