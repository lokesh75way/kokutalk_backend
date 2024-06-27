import createHttpError from "http-errors";
import { loadConfig } from "../helper/config";
import twilio from "twilio";
import { sendOtp } from "./sms";
import User, { IUser } from "../schema/User";
import Contact from "../schema/Contact";
import Call, { Provider } from "../schema/Call";
import Credit, { Currency } from "../schema/Credit";
import { PricingV2VoiceVoiceNumberOutboundCallPrices } from "twilio/lib/rest/pricing/v2/voice/number";
import CallRate, { DurationUnit } from "../schema/CallRate";
import { calculatePrice } from "../helper/common";
import mongoose from "mongoose";

loadConfig();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

interface CallRatePrice extends PricingV2VoiceVoiceNumberOutboundCallPrices {
  current_price?: string | undefined;
  base_price?: number | undefined;
}


export const makeCall = async (phoneNumber: string, countryCode: string, user: IUser): Promise<any> => {
  try {
    if(!accountSid || !authToken || !countryCode || !phoneNumber) {
      throw createHttpError(500, { message: "Call can't be made. Please check credential of message service provider and phone number." });
    }

    const client = twilio(accountSid, authToken);

    const existingCaller = await Contact.findOne({ _id: user?.contact, isDeleted: false}).lean();

    const userCredit = await Credit.findOne( { _id: user?.credit, isDeleted: false }).lean();
    
    // if(!userCredit?.expireAt || new Date(userCredit?.expireAt) < new Date(Date.now())) {
    //   throw createHttpError(500, { message: "Your account credit has expired. Please add credit to your account" });
    // }
    
    if(!existingCaller?.sid) {
      throw createHttpError(500, { message: "Your contact number doesn't exist or is not verified to make any call. Please add your contact number and verify it" });
    }
    
    const providerCallRateDetail = await getCallRate(existingCaller?.countryCode + existingCaller?.phoneNumber, countryCode + phoneNumber);

    const { price = 0, price_unit = Currency.USD } = providerCallRateDetail || {};
    const creditBalance = userCredit?.remainingAmount ? Number(userCredit?.remainingAmount) : 0;


    const applicationCallRateDetail = await CallRate.findOne( { isDeleted: false, fromCountryCode:existingCaller?.countryCode, toCountrycode: countryCode }).lean();

    let callRateDetail = null;
    if(applicationCallRateDetail?._id) {
      callRateDetail = { 
        duration: applicationCallRateDetail.duration,
        durationUnit: applicationCallRateDetail.duration,
        price: applicationCallRateDetail.price,
        tax: applicationCallRateDetail.tax,
        currency: applicationCallRateDetail.currency 
      }
    }

    const { price: applicationCallRate = 0 } = applicationCallRateDetail || {}
    // if(creditBalance < Number(price) || creditBalance < Number(applicationCallRate)) {
    //   throw createHttpError(500, { message: "Your account has insufficient balance to make this call. Please add credit to your account" });
    // }
    
    const existingUser = await User.findOne( { isDeleted: false, phoneNumber, countryCode }).lean();

    const contactAdded = await Contact.findOneAndUpdate(
      { phoneNumber, countryCode, userId: existingUser?._id, 
        createdBy: user?._id, isDeleted: false, 
      }, 
      {
        $setOnInsert: {
          phoneNumber,
          countryCode,
          userId: existingUser?._id,
          createdBy: user?._id
        }
      },
      {
        new: true,
        upsert: true
    }).lean().exec();

    const callerDetail = {
      firstName: existingCaller.firstName,
      lastName: existingCaller.lastName,
      phoneNumber: existingCaller.phoneNumber,
      countryCode: existingCaller.countryCode,
      status: existingCaller.status,
      sid: existingCaller.sid,
      userId: user?._id,
      userName: user?.name,
    }

    const receiverDetail = {
      firstName: contactAdded.firstName,
      lastName: contactAdded.lastName,
      phoneNumber: contactAdded.phoneNumber,
      countryCode: contactAdded.countryCode,
      status: contactAdded.status,
      sid: contactAdded.sid,
      userId: existingUser?._id,
      userName: existingUser?.name,
    }

    const call = await client.calls
    .create({
        twiml: '<Response><Say>Hello!</Say></Response>',
        to: countryCode + phoneNumber,
        from: existingCaller?.countryCode + existingCaller?.phoneNumber,
        statusCallback: `${process.env.SERVER_URL}/calls/update`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    })

    await Call.findOneAndUpdate({
       caller: existingCaller?._id,
       receiver: contactAdded?._id,
       isDeletedByCaller: false,
       isDeletedByReceiver: false,
       $or: [{ sid: { $exists: false } }, { sid: { $in: ["", null] }}]
    }, {
      $setOnInsert: {
        caller: existingCaller?._id,
        receiver: contactAdded?._id,
        callerDetail,
        receiverDetail,
        status: call?.status,
        sid: call?.sid,
        creditUsed: user?.credit,
        providerCallRate: {
          name: Provider.TWILIO,
          duration: 1,
          durationUnit: DurationUnit.MINUTE,
          price,
          currency: price_unit,
          tax: 0
        },
        callRate: applicationCallRateDetail?._id,
        callRateDetail 
      }
    }, { new: true, upsert: true}).lean().exec();
 
    return {};
  } catch (error: any) {
    throw createHttpError(500, { message: error?.message || "Call can't be made. Please check credential of service provider and phone number." });
  }
};

export const updateCallStatus = async (callId: string): Promise<any> => {
    try {
      if(!accountSid || !authToken) {
        createHttpError(500, { message: "Call status can't be updated. Please check credential of service provider and phone number." });
      }
      const client = twilio(accountSid, authToken);

      const callData = await client.calls(callId).fetch();

      const callDetail = await Call.findOne( { sid: callId }).lean();

      const callStartTime = callData?.startTime ? new Date(callData?.startTime) : null;
      const callEndTime = callData?.endTime ? new Date(callData?.endTime) : null;

      let providerTotalPrice = 0, creditAmountUsed = 0;
      if(callStartTime && callEndTime) {
        providerTotalPrice = calculatePrice(callStartTime, callEndTime, callDetail?.providerCallRate)
        creditAmountUsed = calculatePrice(callStartTime, callEndTime, callDetail?.callRateDetail);
      }

      creditAmountUsed = callDetail?.callRateDetail ? creditAmountUsed : providerTotalPrice;

      await Credit.findOneAndUpdate({ _id: callDetail?.creditUsed }, { 
        $inc: { remainingAmount: -1*creditAmountUsed }
      }, { new: true}).lean().exec();

      await Call.findOneAndUpdate( { 
        _id: callDetail?._id,
      }, { $set: {
         status: callData?.status,
         startedAt: callStartTime,
         endedAt: callEndTime,
         providerTotalPrice,
         creditAmountUsed
      }}, { new: true}).lean().exec();

    } catch (error: any) {
      createHttpError(500, { message: "Call status can't be updated. Please check credential of service provider and phone number." });
    }
};

// Helper fn to add number into twilio account to be able to make call
export const addNumber = async (phoneNumber: string): Promise<any> => {
  try {
    if(!accountSid || !authToken || !phoneNumber) {
      throw createHttpError(500, { message: "Number can't be added. Please check credential of message service provider and phone number." });
    }
    const client = twilio(accountSid, authToken);

    const outgoingCallerIds = await getNumber(phoneNumber);

    if(!outgoingCallerIds?.sid) {
      const validationRequest =  await client.validationRequests.create({
        // friendlyName: phoneNumber,
        phoneNumber: phoneNumber,
        callDelay: 20,
        statusCallback: `${process.env.SERVER_URL}/users/verify-number`
      });
      if(validationRequest?.validationCode) {
        await sendOtp(parseInt(validationRequest.validationCode), phoneNumber, "phone number verification")
      } else {
        throw createHttpError(500, { message: "Number can't be added. Please check credential of service provider and phone number." });
      }
    }

  } catch (error: any) {
    throw createHttpError(500, { message: "Number can't be added. Please check credential of service provider and phone number." });
  }
};

// Helper fn to handle webhook request providing result of verification process of number 
export const validateNumber = async (payload: any): Promise<any> => {
  try {
    console.log("\n\n request returned", payload);
    return;

  } catch (error: any) {
    throw createHttpError(500, { message: "Number can't be verified. Please check credential of service provider and phone number." });
  }
};

// Helper fn to delete number added into twilio account
export const deleteNumber = async (phoneNumber: string): Promise<any> => {
  try {
    const client = twilio(accountSid, authToken);
    const numberAdded = await getNumber(phoneNumber);
    if(numberAdded?.sid) {
      await client.outgoingCallerIds(numberAdded?.sid).remove();
    }
  } catch (error: any) {
    throw createHttpError(500, { message: "Number can't be deleted. Please check credential of service provider and phone number." });
  }
};

// Helper fn to get number added into twilio account
export const getNumber = async (phoneNumber: string): Promise<any> => {
  try {
    const client = twilio(accountSid, authToken);
    const outgoingCallerIds = await client.outgoingCallerIds.list({ phoneNumber });
    return outgoingCallerIds[0];
  } catch (error: any) {
    throw createHttpError(500, { message: "Number can't be fetched. Please check credential of service provider and phone number." });
  }
};

// Helper fn to get service provider call rate to make call from one number to other
export const getCallRate = async (originNumber: string, destinationNumber: string): Promise<any> => {
  try {
    if(!accountSid || !authToken) {
      createHttpError(500, { message: "Call rate can't be fetched. Please check credential of service provider and phone number." });
    }
    const client = twilio(accountSid, authToken);
    const pricing = await client.pricing.v2.voice.numbers(destinationNumber).fetch({ originationNumber: originNumber });
    
    if(!pricing?.url) {
      throw createHttpError(500, { message: "Call rate can't be fetched. Please check credential of service provider and phone number." });
    }                           
    
    const priceDetail: CallRatePrice =  pricing.outboundCallPrices[0];
    const price = priceDetail?.current_price ? Number(priceDetail?.current_price) : 0;
    
    return { price, priceUnit: pricing?.priceUnit };
  } catch (error: any) {
    throw createHttpError(500, { message: "Call rate can't be fetched. Please check credential of service provider and phone number." });
  }
};

export const getCallLog = async (userId: string) => {
  try {
    const callSearch:any = { 
      $and: [
      { 
          
        $or: [
        { "callerDetail.userId": new mongoose.Types.ObjectId(userId), },
        { "receiverDetail.userId": new mongoose.Types.ObjectId(userId), } 
        ]
      },
      { 
          
        $or: [
        { "isDeletedByCaller": false },
        { "isDeletedByReceiver": false } 
        ]
      }
      ]
    }

    const calls = await Call.aggregate([
      { $match: callSearch},
      { $group: { _id: { "caller": '$caller', "receiver": "$receiver" }, 
        calls: { $push: "$$ROOT" }
      }}
    ]).allowDiskUse(true).exec();

    return calls;
  } catch(error) {
    throw createHttpError(500, { message: "Something went wrong in fetching call logs." });
  }
};