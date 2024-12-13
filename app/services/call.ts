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
import { calculatePrice, parsePayload } from "../helper/common";
import mongoose from "mongoose";
import { escapeRegex } from "../helper/common";
import moment from "moment-timezone";

loadConfig();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const serviceSid = process.env.TWILIO_APP_SERVICE_SID;

interface CallRatePrice extends PricingV2VoiceVoiceNumberOutboundCallPrices {
  current_price?: string | undefined;
  base_price?: number | undefined;
}

interface CallLogPayload {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  pageIndex?: string | number | null;
  pageSize?: string | number | null;
  from?: string | null;
  to?: string | null;
  userId?: string | null;
}


export const makeCall = async (phoneNumber: string, countryCode: string, user: IUser): Promise<any> => {
  try {
    if(!accountSid || !authToken || !countryCode || !phoneNumber || !twilioPhoneNumber) {
      throw createHttpError(500, { message: "Call can't be made. Please check credential of service provider and phone number." });
    }

    const client = twilio(accountSid, authToken);

    let existingCaller = await Contact.findOne({ _id: user?.contact, isDeleted: false}).lean();

    const userCredit = await Credit.findOne( { usedBy: user?._id, isDeleted: false }).lean();
    
    if(!userCredit?._id) {
      throw createHttpError(500, { message: "Please add credit to your account" });
    }

    const callerNumber = (existingCaller?.countryCode || "") + (existingCaller?.phoneNumber || "")
    const existingNumber = await getNumber(callerNumber)
    

    if(existingNumber?.sid != existingCaller?.sid) {
      existingCaller = await Contact.findOneAndUpdate({ _id: existingCaller?._id }, { $set: { sid: existingNumber?.sid }}, { new: true}).lean().exec();
    }

    if(!existingCaller?._id || !existingNumber?.sid) {
      throw createHttpError(500, { message: "Your contact number doesn't exist. Please add your contact number and verify it" });
    }

    const recevingNumber = (countryCode || "") + (phoneNumber || "")
    const existingReceivingNumber = await getNumber(recevingNumber)
    
    if(!existingReceivingNumber?.sid) {
      throw createHttpError(500, { message: "Dialed number is not verified. Please verify it" });
    }
    
    const providerCallRateDetail = await getCallRate(existingCaller?.countryCode + existingCaller?.phoneNumber, countryCode + phoneNumber);

    const { price = 0, price_unit = Currency.USD } = providerCallRateDetail || {};
    const creditBalance = userCredit?.remainingAmount ? Number(userCredit?.remainingAmount) : 0;

    const callRateSearch = parsePayload(JSON.stringify({ fromCountryCode: existingCaller?.countryCode, toCoutryCode: countryCode}), ["fromCountryCode", "toCountryCode"])

    const applicationCallRateDetail = await CallRate.findOne( { 
      ...callRateSearch, isDeleted: false 
    }).lean().exec();

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
    if(creditBalance < Number(price) || creditBalance < Number(applicationCallRate)) {
      throw createHttpError(500, { message: "Your account has insufficient balance to make this call. Please recharge your account" });
    }

    const countryCodeSearch = parsePayload(JSON.stringify({ countryCode }), ["countryCode"])
    
    const existingUser = await User.findOne( { ...countryCodeSearch, isDeleted: false, phoneNumber }).lean();

    
    
    const contactAdded = await Contact.findOneAndUpdate(
      { ...countryCodeSearch, phoneNumber, userId: existingUser?._id, 
        createdBy: user?._id, isDeleted: false, 
      },
      {
        $set: { sid: existingReceivingNumber?.sid }, 
        $setOnInsert: {
          phoneNumber,
          countryCode,
          userId: existingUser?._id,
          createdBy: user?._id,
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
        status: "",
        sid: "",
        creditUsed: userCredit?._id,
        providerCallRate: {
          name: Provider.TWILIO,
          duration: 1,
          durationUnit: DurationUnit.MINUTE,
          price,
          currency: price_unit,
          tax: 0
        },
        callRate: applicationCallRateDetail?._id,
        callRateDetail,
        dialerSid: accountSid 
      }
    }, { new: true, upsert: true}).lean().exec();
 
    return {};
  } catch (error: any) {
    throw createHttpError(500, { message: error?.message || "Call can't be made. Please check credential of service provider and phone number." });
  }
};

export const updateCallStatus = async (callId: string, callRefId: string): Promise<any> => {
    try {
      if(!accountSid || !authToken || !twilioPhoneNumber) {
        throw createHttpError(500, { message: "Call status can't be updated. Please check credential of service provider and phone number." });
      }

      const client = twilio(accountSid, authToken);

      const callData = await client.calls(callId).fetch();

      const receivingNumber = await getNumber(callData?.to);

      if(!receivingNumber?.sid) {
        throw createHttpError(500, { message: "Call status can't be updated. Please check credential of service provider and dialed number." });
      }

      if(!callRefId || !mongoose.isObjectIdOrHexString(callRefId)) {
        throw createHttpError(500, { message: "Invalid call id provided to update status" });
      }

      const callDetail = await Call.findOne( { _id: callRefId,
        isDeletedByCaller: false,
       isDeletedByReceiver: false,
       }).lean().exec();

      if(!callDetail?._id) {
        throw createHttpError(500, { message: "Call record not found to update status" });
      }

      const callStartTime = callData?.startTime ? new Date(callData?.startTime) : null;
      const callEndTime = callData?.endTime ? new Date(callData?.endTime) : null;
      
      let providerTotalPrice = 0, creditAmountUsed = 0;
      if(callStartTime && callEndTime) {
        providerTotalPrice = calculatePrice(callStartTime, callEndTime, callDetail?.providerCallRate)
        creditAmountUsed = calculatePrice(callStartTime, callEndTime, callDetail?.callRateDetail);
      }

      creditAmountUsed = callDetail?.callRateDetail ? creditAmountUsed : providerTotalPrice;
      
      await Credit.findOneAndUpdate({ _id: callDetail?.creditUsed,
        remainingAmount: { $gte: creditAmountUsed }
       }, { 
        $inc: { remainingAmount: -1*creditAmountUsed }
      }, { new: true}).lean().exec();

      await Call.findOneAndUpdate( { 
        _id: callDetail?._id,
      }, { 
        $set: {
         sid: callId,
         status: callData?.status,
         startedAt: callStartTime,
         endedAt: callEndTime,
         providerTotalPrice,
         creditAmountUsed
      }}, { new: true, upsert: true }).lean().exec();

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

export const getCallLog = async (userId: string, payload: CallLogPayload) => {
  try {
    const { pageIndex = "", pageSize = "", firstName = "", lastName = "", phoneNumber = "", countryCode = "" } = payload;
    
    let pageIndexToSearch = pageIndex && !Number.isNaN(pageIndex) ? parseInt(pageIndex + "") : 1;
    let pageSizeToSearch = pageSize && !Number.isNaN(pageSize) ? parseInt(pageSize + "") : 10;
    pageIndexToSearch = pageIndexToSearch > 0 ? pageIndexToSearch : 1;
    pageSizeToSearch = pageSizeToSearch > 0 ? pageSizeToSearch : 10;
    const skipedCall = (pageIndexToSearch - 1)*pageIndexToSearch;

    let userCallSearch = {};

    if(userId && mongoose.isObjectIdOrHexString(userId)) {
      userCallSearch = { 
        $or: [
        { "callerDetail.userId": new mongoose.Types.ObjectId(userId), },
        { "receiverDetail.userId": new mongoose.Types.ObjectId(userId), } 
        ]
      }
    }

    const callSearch:any = { 
      $and: [
      userCallSearch,
      { 
          
        $or: [
        { "isDeletedByCaller": false },
        { "isDeletedByReceiver": false } 
        ]
      }
      ]
    }

    const searchQuery: any = [];

    if(firstName) {

      searchQuery.push({
        $or: [
          { "callerDetail.firstName": new RegExp(escapeRegex(firstName), 'i') },
          { "receiverDetail.firstName": new RegExp(escapeRegex(firstName), 'i') }
        ]
      })
    }
    if(lastName) {
      searchQuery.push({
        $or: [
          { "callerDetail.lastName": new RegExp(escapeRegex(lastName), 'i') },
          { "receiverDetail.lastName": new RegExp(escapeRegex(lastName), 'i') }
        ]
      })
    }
    if(phoneNumber) {
      searchQuery.push({
        $or: [
          { "callerDetail.phoneNumber": new RegExp(escapeRegex(phoneNumber), 'i') },
          { "receiverDetail.phoneNumber": new RegExp(escapeRegex(phoneNumber), 'i') }
        ]
      })
    }
    if(countryCode) {
      searchQuery.push({
        $or: [
          { "callerDetail.phoneNumber": new RegExp(escapeRegex(countryCode), 'i') },
          { "receiverDetail.phoneNumber": new RegExp(escapeRegex(countryCode), 'i') }
        ]
      })
    }

    if(searchQuery.length) {
      callSearch["$and"].push({ "$or": searchQuery })
    }

    const dateSearch: any = { };

    if(payload.from) {
      const startDateTime = moment(payload.from).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).format();
      dateSearch["createdAt"] = { $gte: startDateTime };
    }

    if(payload.to) {
        const endDateTime = moment(payload.to).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).format();
        dateSearch["createdAt"] = { ...dateSearch["createdAt"], $lte: endDateTime };
    }

    const callCount = await Call.find({...callSearch, ...dateSearch}).countDocuments();

    const calls = await Call.aggregate([
      { $match: {...callSearch, ...dateSearch} },
      { $sort: { createdAt: -1 } },
      { $skip: skipedCall },
      { $limit: pageSizeToSearch },
      { $group: { _id: { "caller": '$caller', "receiver": "$receiver" }, 
        calls: { $push: "$$ROOT" }
      }},
    ]).allowDiskUse(true).exec();

    return { log: calls, totalCount: callCount, pageCount: Math.ceil(callCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: calls.length
    };
  } catch(error) {
    throw createHttpError(500, { message: "Something went wrong in fetching call logs." });
  }
};

export const generateToken = async (identity: string) => {
  try {
    if(!accountSid || !apiKeySid || !apiKeySecret) {
      throw createHttpError(500, { message: "Token cannot be generated. Please check credential of service provider." });
    }
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: serviceSid,
      incomingAllow: true,
    });

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity: identity,
    });

    token.addGrant(voiceGrant);

    return token.toJwt();

  } catch (error) {
    console.log("===========Error in fn to generate token", error);
    throw createHttpError(500, { message: "Token cannot be generated. Please check credential of service provider." });
  }
};

export const dialNumber = async (dialedNumber: string, dialingNumber: string) => {
  try {
    if(!accountSid || !apiKeySid || !apiKeySecret) {
      throw createHttpError(500, { message: "Token cannot be generated. Please check credential of service provider." });
    }
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    response.dial()

    if (!dialedNumber) {
      return createHttpError(500, { error: "Dialed number is not set" });
    }

    if (!dialingNumber) {
      return createHttpError(500, { error: "Dialing number is not set" });
    }

    const callerPhoneNumber = dialingNumber.slice(-10);
    const callerCountryCode = dialingNumber.slice(0, dialingNumber.length - 10);

    const receiverPhoneNumber = dialedNumber.slice(-10);
    const receiverCountryCode = dialedNumber.slice(0, dialedNumber.length - 10);
 
    const dialedCall = await Call.findOne({
      "callerDetail.phoneNumber": callerPhoneNumber,
      "callerDetail.countryCode": callerCountryCode,
      "receiverDetail.phoneNumber": receiverPhoneNumber,
      "receiverDetail.countryCode": receiverCountryCode,
      isDeletedByCaller: false,
      isDeletedByReceiver: false,
      $or: [{ sid: { $exists: false } }, { sid: { $in: ["", null] }}]
    }).lean().exec();

    const callId = dialedCall?._id || "";

    if (!callId) {
      return createHttpError(500, { error: "No current call between caller and receiver" });
    }


    const statusCallbackUrl =
      `${process.env.SERVER_URL}/call-status/${callId}`;

    const dial = response.dial({ callerId: dialingNumber || process.env.TWILIO_PHONE_NUMBER });

    dial.number(
      {
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "answered", "ringing", "completed"],
      },
      dialedNumber,
    );

    return dial.toString();

  } catch (error) {
    console.log("===========Error in fn to dial number", error);
    throw createHttpError(500, { message: "Something went wrong in dialing a number." });
  }
};

export const getCall = async (userId: string, payload: CallLogPayload) => {
  try {
    const { pageIndex = "", pageSize = "", firstName = "", lastName = "", phoneNumber = "", countryCode = "" } = payload;
    
    let pageIndexToSearch = pageIndex && !Number.isNaN(pageIndex) ? parseInt(pageIndex + "") : 1;
    let pageSizeToSearch = pageSize && !Number.isNaN(pageSize) ? parseInt(pageSize + "") : 10;
    pageIndexToSearch = pageIndexToSearch > 0 ? pageIndexToSearch : 1;
    pageSizeToSearch = pageSizeToSearch > 0 ? pageSizeToSearch : 10;
    const skipedCall = (pageIndexToSearch - 1)*pageIndexToSearch;

    let userCallSearch = {};

    if(userId && mongoose.isObjectIdOrHexString(userId)) {
      userCallSearch = { 
        $or: [
        { "callerDetail.userId": new mongoose.Types.ObjectId(userId), },
        { "receiverDetail.userId": new mongoose.Types.ObjectId(userId), } 
        ]
      }
    }

    const callSearch:any = { 
      $and: [
      userCallSearch,
      { 
          
        // $or: [
        // { "isDeletedByCaller": false },
        // { "isDeletedByReceiver": false } 
        // ]
      }
      ]
    }

    const searchQuery: any = [];

    if(firstName) {

      searchQuery.push({
        $or: [
          { "callerDetail.firstName": new RegExp(escapeRegex(firstName), 'i') },
          { "receiverDetail.firstName": new RegExp(escapeRegex(firstName), 'i') }
        ]
      })
    }
    if(lastName) {
      searchQuery.push({
        $or: [
          { "callerDetail.lastName": new RegExp(escapeRegex(lastName), 'i') },
          { "receiverDetail.lastName": new RegExp(escapeRegex(lastName), 'i') }
        ]
      })
    }
    if(phoneNumber) {
      searchQuery.push({
        $or: [
          { "callerDetail.phoneNumber": new RegExp(escapeRegex(phoneNumber), 'i') },
          { "receiverDetail.phoneNumber": new RegExp(escapeRegex(phoneNumber), 'i') }
        ]
      })
    }
    if(countryCode) {
      searchQuery.push({
        $or: [
          { "callerDetail.phoneNumber": new RegExp(escapeRegex(countryCode), 'i') },
          { "receiverDetail.phoneNumber": new RegExp(escapeRegex(countryCode), 'i') }
        ]
      })
    }

    if(searchQuery.length) {
      callSearch["$and"].push({ "$or": searchQuery })
    }

    const dateSearch: any = { };

    if(payload.from) {
      const startDateTime = moment(payload.from).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).format();
      dateSearch["createdAt"] = { $gte: startDateTime };
    }

    if(payload.to) {
        const endDateTime = moment(payload.to).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).format();
        dateSearch["createdAt"] = { ...dateSearch["createdAt"], $lte: endDateTime };
    }

    const callCount = await Call.find({...callSearch, ...dateSearch}).countDocuments();

    const calls = await Call.aggregate([
      { $match: {...callSearch, ...dateSearch} },
      { $sort: { createdAt: -1 } },
      { $skip: skipedCall },
      { $limit: pageSizeToSearch },
    ]).allowDiskUse(true).exec();

    return { calls, totalCount: callCount, pageCount: Math.ceil(callCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: calls.length
    };
  } catch(error) {
    throw createHttpError(500, { message: "Something went wrong in fetching call history." });
  }
};