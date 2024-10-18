import mongoose, { Types } from "mongoose";
import Otp, { IOtp } from "../schema/Otp"
import * as userService from "./user";
import User from "../schema/User";
import { sendOtp } from "./sms";
import Contact from "../schema/Contact";
import { saveNotification } from "./notification";

const OtpExpireTime = process.env.OTP_EXPIRATION_TIME_LIMIT || "20m";

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
      default:
        throw new Error('Invalid expiration format');
    }
};


export const  saveOtp = async (phoneNumber: string, countryCode: string) => {
    const expirationMinutes = parseExpireTime(OtpExpireTime);
    const otpValue = generateOtp();
    const expireAt = new Date(Date.now() + expirationMinutes * 60000);
    const registeredUser = await User.findOneAndUpdate({ 
        phoneNumber,
        countryCode,
        isDeleted: false
    }, {
        $setOnInsert: {
            phoneNumber,
            countryCode
        }
    }, { new: true, upsert: true }).lean().exec();

    const newOtp  = await Otp.create({
      value: otpValue,
      expireAt : expireAt,
      userId: registeredUser?._id
    })

    await saveNotification(registeredUser?._id, { entityType: "registration",
      message: `Registration successful for kokutalk.`
    })

    const contactAdded = await Contact.findOneAndUpdate(
        { phoneNumber, countryCode, userId: registeredUser?._id, 
          createdBy: registeredUser?._id, isDeleted: false 
        }, 
        {
          $setOnInsert: {
            phoneNumber,
            countryCode,
            userId: registeredUser?._id,
            createdBy: registeredUser?._id
          }
        },
        {
          new: true,
          upsert: true
    }).lean().exec();
    await userService.updateUser(registeredUser._id,{otp : new mongoose.Types.ObjectId(newOtp._id), contact: registeredUser?.contact ? new mongoose.Types.ObjectId(registeredUser?.contact)  : new mongoose.Types.ObjectId(contactAdded?._id) }) ;
    console.log("OTP ========== ",newOtp.value);
    await sendOtp(otpValue, countryCode + phoneNumber, registeredUser.name ? "login" : "registration")
}

export const generateOtp = () => {
    return (Math.floor(10000 + Math.random() * 90000));
}

export const updateOtp = async (otpDetails : IOtp) => {
    const lastUseAt = new Date(Date.now()) ;
    const otp = await Otp.findOneAndUpdate({_id : otpDetails._id}, {
        $set: { lastUseAt },
        $inc: { useCount: 1}
    },{new : true}) ;
    return otp;
}