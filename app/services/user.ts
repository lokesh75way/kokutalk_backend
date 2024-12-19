import User, { IUser } from "../schema/User";
import Otp from "../schema/Otp";
import Contact, { IContact } from "../schema/Contact";
import createHttpError from "http-errors";
import { escapeRegex, parsePayload } from "../helper/common";
import { getNumber, addNumber } from "./call";
import mongoose from "mongoose";

interface PhoneNumberPayload {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  pageIndex?: string | number | null;
  pageSize?: string | number | null;
}

interface NumberPayload extends IContact {
  isPrimary?: boolean
}

export const createUser = async (data: IUser) => {
  const user = await User.create({ ...data});
  const {...userWithoutOtp} = user.toObject() ;
  return userWithoutOtp;
};

export const updateUser = async (userId: string, data: Partial<IUser>) => {
  const user = await User.findOneAndUpdate({ _id: userId, isDeleted: false}, data, {
    new: true,
    projection: "-otp -card -invitedBy",
  }).lean().exec();
  return user;
};

export const getUserById = async (id: string) => {
  const user = await User.findOne({ _id: id, isDeleted: false }
  ).lean();
  return user;
};

/**
 * * Function to get user by otp data if otp matches
 */
export const matchOtp = async(otp:Number)  => {
  const result = await Otp.aggregate([ 
      {
        $match : {
          value: otp 
          }
      },
      {
        $lookup : {
          from : "users",
          localField : "_id",
          foreignField : "otp",
          as : "userDetails"
        }
      },
      {
        $match : {
          "userDetails.isDeleted" : false,
        }
      },
      {
        $unwind : "$userDetails"
      },
      {
        $project : {
          "userDetails._id" : 1 ,
          "_id" : 1 ,
          "expireAt" : 1,
          "useLimit": 1,
          "useCount": 1,
          "lastUseAt": 1 
        }
      }
  ]).exec();
  return result ;
}

export const addPhoneNumber = async (userId: string, data: Partial<NumberPayload>) => {
  try {
    const countryCodeSearch = parsePayload(JSON.stringify({ countryCode: data.countryCode }), ["countryCode"])
      const number = await Contact.findOneAndUpdate({
          ...countryCodeSearch, 
          createdBy: userId, isDeleted: false,
          phoneNumber: data?.phoneNumber,
          userId
       }, { 
          $set: {
              firstName: data?.firstName,
              lastName: data?.lastName,
              phoneNumber: data?.phoneNumber,
              countryCode: data?.countryCode
          },
          $setOnInsert: {
             createdBy: userId,
             userId
          }
      }, {
          new: true,
          upsert: true
      }).lean().exec();

      if(data?.isPrimary) {
        await updateUser(userId, { contact: number?._id ? new mongoose.Types.ObjectId(number?._id) : null, phoneNumber : data?.phoneNumber, countryCode: data?.countryCode })
      }

      return { number };
  } catch(error) {
      throw createHttpError(500, { message: "Something went wrong in adding user phone number." });
  }
};

export const updatePhoneNumber = async (userId: string, contactId: string, data: Partial<NumberPayload>) => {
  try {
      const number = await Contact.findOneAndUpdate({ _id: contactId, createdBy: userId, isDeleted: false, userId }, 
          { $set: { ...data, updatedBy: userId } }, {
          new: true,
      }).lean().exec();

      if(data?.isPrimary) {
        await updateUser(userId, { contact: new mongoose.Types.ObjectId(contactId), phoneNumber : data?.phoneNumber, countryCode: data?.countryCode })
      }

      return { number };

  } catch(error) {
      throw createHttpError(500, { message: "Something went wrong in updating phone number." });
  }
};

export const getPhoneNumber = async (userId: string, payload: PhoneNumberPayload) => {
  try {
      const { pageIndex = "", pageSize = "", firstName = "", lastName = "", phoneNumber = "", countryCode = "" } = payload;
      
      let pageIndexToSearch = pageIndex && !Number.isNaN(pageIndex) ? parseInt(pageIndex + "") : 1;
      let pageSizeToSearch = pageSize && !Number.isNaN(pageSize) ? parseInt(pageSize + "") : 10;
      pageIndexToSearch = pageIndexToSearch > 0 ? pageIndexToSearch : 1;
      pageSizeToSearch = pageSizeToSearch > 0 ? pageSizeToSearch : 10;
      const skipedNumber = (pageIndexToSearch - 1)*pageIndexToSearch;

      const numberSearch:any = { 
          createdBy: userId, isDeleted: false, userId
      }

      if(firstName) {
          numberSearch["firstName"] = new RegExp(escapeRegex(firstName), 'i')
      }
      if(lastName) {
          numberSearch["lastName"] = new RegExp(escapeRegex(lastName), 'i')
      }
      if(phoneNumber) {
          numberSearch["phoneNumber"] = new RegExp(escapeRegex(phoneNumber), 'i')
      }
      if(countryCode) {
          numberSearch["countryCode"] = new RegExp(escapeRegex(countryCode), 'i')
      }

      const numberCount = await Contact.find(numberSearch).countDocuments();
      const numbers = await Contact.find(numberSearch).sort({ createdAt: -1 }).skip(skipedNumber).limit(pageSizeToSearch).lean().exec();

      return { numbers, totalCount: numberCount, pageCount: Math.ceil(numberCount/pageSizeToSearch),
          pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: numbers.length
      };
  } catch(error) {
      throw createHttpError(500, { message: "Something went wrong in fetching user phone number list." });
  }
  
};

export const getPhoneNumberById = async (userId: string, contactId: string) => {
  try {
      const numberSearch = { 
          createdBy: userId, isDeleted: false, 
          _id: contactId,
          userId
      }
      const number = await Contact.findOne(numberSearch).lean().exec();
      if(!number?._id) {
          throw createHttpError(400, { message: "Phone number is either deleted or doesn't exist." });
      }
      return { number };
  } catch(error) {
      throw createHttpError(500, { message: "Something went wrong in fetching phone number by id." });
  }
};

export const validatePhoneNumberById = async (userId: string, contactId: string, data: Partial<IContact>) => {
  try {
      const phoneNumber = data?.countryCode || "" + data?.phoneNumber || ""
      const validatedNumber = await getNumber(phoneNumber);
      if(!validatedNumber?.sid) {
        await addNumber(phoneNumber)
      }
      const updatedNumber = await updatePhoneNumber(userId, contactId, { sid: validatedNumber?.sid });
      return updatedNumber;
  } catch(error) {
      throw createHttpError(500, { message: "Something went wrong in fetching phone number by id." });
  }
};

export const deletePhoneNumber = async (userId: string, contactId: string) => {
  try {
      const number = await Contact.findOneAndUpdate({ _id: contactId, createdBy: userId, isDeleted: false, userId }, 
          { $set: { isDeleted: true, deletedAt: new Date(Date.now()), deletedBy: userId } }, {
          new: true,
      }).lean().exec();

      return { number };

  } catch(error) {
      throw createHttpError(500, { message: "Something went wrong in deleting phone number." });
  }
};