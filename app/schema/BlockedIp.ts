import mongoose from "mongoose";
import { BaseSchema } from ".";

const Schema = mongoose.Schema;

export interface IBlockedIp extends BaseSchema {
    ip: string;
    isBlocked: boolean;
}

const BlockedIpSchema = new Schema<IBlockedIp>(
    {
        ip: { type: String, required: true },
        isBlocked: {type: Boolean, required: true, default: true},
    },
    { timestamps: true }
);


export default mongoose.model<IBlockedIp>("blocked_ip", BlockedIpSchema);