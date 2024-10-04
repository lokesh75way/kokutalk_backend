import mongoose, { Types } from "mongoose";
import createHttpError from "http-errors";
import Token, { IToken, TokenType } from "../schema/Token"
import * as AdminService from "./admin";
import { IUser } from "../schema/User";
import { IAdmin } from "../schema/Admin";

const OtpExpireTime = process.env.OTP_EXPIRATION_TIME_LIMIT || "24h";

/**
 * Function to get expiration in minutes for using token/otp
 * @param expireTime : string
 * @returns 
 */
export const parseExpireTime = (expireTime: string): number => {
    const unit = expireTime.slice(-1);
    const value = parseInt(expireTime.slice(0, -1));

    switch (unit) {
      case 'm':
        return value*60; // Minutes
      case 'h':
        return value * 60 * 60; // Convert hours to minutes
      case 'd':
        return value * 24 * 60 * 60; // Convert days to minutes (24 hours * 60 minutes)
      case 's':
        return value;
      default:
        throw new Error('Invalid expiration format');
    }
};

export const generateOtp = () => {
  return (Math.floor(10000 + Math.random() * 90000)) + "";
}

export const saveToken = async (
    adminId: string,
    type: TokenType.PasswordReset | TokenType.OtpVerification 
  ) => {
    try {
      const otp = generateOtp();
      const expirationMinutes = parseExpireTime(OtpExpireTime);
      const expireAt = new Date(Date.now() + expirationMinutes * 1000);
      const newToken = await Token.findOneAndUpdate(
        { adminId, type },
        { $set: { value: otp, expireAt, useLimit: 1, useCount: 0 },
          $setOnInsert: { adminId, type } },
        { new: true, upsert: true }).lean().exec();
      console.log("OTP ========== ", newToken.value);
      return newToken;
    } catch (error) {
      throw createHttpError(500, {
        message: "Something went wrong in saving token",
      });
    }
};

export const updateToken = async (
    tokenDetails: IToken,
    adminId: string,
    adminDetails: IAdmin,
    tokenType: TokenType.OtpVerification | TokenType.PasswordReset
  ) => {
    try {
      const otpType = tokenType.replace("_", " ")
      if (
        !tokenDetails?.expireAt ||
        tokenDetails?.expireAt.getTime() < Date.now()
      ) {
        throw createHttpError(400, {
          message: `Otp expired. Please use new otp for ${otpType}.`,
        });
      }
      if (tokenDetails?.useCount >= tokenDetails.useLimit) {
        throw createHttpError(400, {
          message: `Otp use limit exceeded. Please use new otp for ${otpType}.`,
        });
      }
      if (adminDetails?.password?.trim()) {
        await AdminService.updateAdmin(adminId, {
          password: adminDetails?.password?.trim(),
        });
        const lastUseAt = new Date(Date.now());
        const token = await Token.findOneAndUpdate(
          { _id: tokenDetails._id },
          {
            $set: { lastUseAt },
            $inc: { useCount: 1 },
          },
          { new: true }
        );
      }
      return {};
    } catch (error: any) {
      throw createHttpError(error?.status || 500, {
        message: error?.message || "Something went wrong in updating token",
      });
    }
};

export const saveSessionToken = async (
    adminId: string,
    userId: string,
    data: Partial<IToken>
  ) => {
    try {
      const tokenSearch:any = { type: TokenType.Access };
      if(adminId && mongoose.isObjectIdOrHexString(adminId)) {
        tokenSearch["adminId"] = adminId
      }
      if(adminId && mongoose.isObjectIdOrHexString(userId)) {
        tokenSearch["userId"] = userId
      }  
      const newToken = await Token.findOneAndUpdate(
        tokenSearch,
        { $set: { value: data.value, expireAt: data.expireAt, useLimit: 1, useCount: 0, refreshToken: data.refreshToken },
          $setOnInsert: tokenSearch },
        { new: true, upsert: true }).lean().exec();
      // console.log("Session Token ========== ", newToken.value);
      return newToken;
    } catch (error) {
      throw createHttpError(500, {
        message: "Something went wrong in saving session token",
      });
    }
};
  
export const getSessionToken = async (
    adminId: string,
    userId: string
    ) => {
    try {
        const tokenSearch:any = { type: TokenType.Access };
        if(adminId && mongoose.isObjectIdOrHexString(adminId)) {
            tokenSearch["adminId"] = adminId
        }
        if(adminId && mongoose.isObjectIdOrHexString(userId)) {
            tokenSearch["userId"] = userId
        }
        const newToken = await Token.findOne(tokenSearch).lean().exec();
        // console.log("Current Session Token ========== ", newToken?.value);
        return newToken;
    } catch (error) {
        throw createHttpError(500, {
        message: "Something went wrong in saving session token",
        });
    }
};

export const deleteSessionToken = async (
    adminId: string,
    userId: string
    ) => {
    try {
        const tokenSearch:any = { type: TokenType.Access };
        if(adminId && mongoose.isObjectIdOrHexString(adminId)) {
            tokenSearch["adminId"] = adminId
        }
        if(adminId && mongoose.isObjectIdOrHexString(userId)) {
            tokenSearch["userId"] = userId
        }
        const newToken = await Token.findOneAndUpdate(
        tokenSearch,
        { $set: { value: "", refreshToken: "" } },
        { new: true }
        ).lean().exec();
        // console.log("Deleted Session Token ========== ", newToken?.value);
        return newToken;
    } catch (error) {
        throw createHttpError(500, {
        message: "Something went wrong in updating session token",
        });
    }
};