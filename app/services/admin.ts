import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import Token, { TokenType } from "../schema/Token";
import Admin, { IAdmin } from "../schema/Admin";
import { isValidPassword } from "./passport-jwt";
import moment from "moment-timezone";
import User from "../schema/User";
import Payment, { PaymentTransactionStatus } from "../schema/Payment";
import Call from "../schema/Call";
import { escapeRegex, parsePagination, parsePayload } from "../helper/common";

export interface PasswordUpdate {
  oldPassword: string;
  newPassword: string;
}

interface DashboardPayload {
  pageIndex?: string | number | null;
  pageSize?: string | number | null;
  from?: string | null;
  to?: string | null;
  name?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
}

interface CustomerPayload {
  userId?: string | null;
  pageIndex?: string | number | null;
  pageSize?: string | number | null;
  from?: string | null;
  to?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
}

export const hashPassword = async (password: string) => {
    const hash = await bcrypt.hash(password, 12);
    return hash;
};

export const createAdmin = async (data: Partial<IAdmin>) => {
  try {
    const admin = await Admin.create({ ...data, password: data.password?.trim() });
    const { password: _p, ...result } = admin.toObject();
    return result;
  } catch (error: any) {
    throw createHttpError(500, { message: "Something went wrong in creating admin" });
  }
};

export const getAdminById = async (id: string) => {
  try {
    const admin = await Admin.findOne({ _id: id, isDeleted: false }
    ).lean();
    return admin;

  } catch (error: any) {
    throw createHttpError(500, { message: "Something went wrong in fetching admin detail" });
  }
};

export const getAdminByEmail = async (email: string) => {
    try {
      const admin = await Admin.findOne({ email, isDeleted: false }
      ).lean();
      return admin;
  
    } catch (error: any) {
      throw createHttpError(500, { message: "Something went wrong in fetching admin detail by email" });
    }
};

/**
 * * Function to get admin by token data if token matches
 */
export const matchAdminToken = async(token:string, email: string, type: TokenType.PasswordReset | TokenType.OtpVerification | TokenType.Access)  => {
  try {
    const result = await Token.aggregate([ 
        {
          $match : {
            value: token,
            type 
          }
        },
        {
          $lookup : {
            from : "admins",
            localField : "adminId",
            foreignField : "_id",
            as : "adminDetails"
          }
        },
        {
          $match : {
            "adminDetails.isDeleted" : false,
            "adminDetails.email": email
          }
        },
        {
          $unwind : "$adminDetails"
        },
        {
          $project : {
            "adminDetails._id" : 1,
            "_id" : 1 ,
            "expireAt" : 1,
            "useLimit": 1,
            "useCount": 1,
            "lastUseAt": 1 
          }
        }
    ]).exec();
    return result;
  } catch (error: any) {
    throw createHttpError(500, { message: "Something went wrong in fetching admin detail by token" });
  }
}

export const updateAdmin = async (adminId: string, data: Partial<IAdmin>) => {
    try {
      const user = await Admin.findOneAndUpdate({ _id: adminId, isDeleted: false}, 
        { $set: { ...data, updatedBy: adminId, updatedAt: new Date(Date.now()) } }, {
          new: true,
          projection: "-password -passwordResetToken",
      }).lean().exec();
      return user;
    } catch (error: any) {
      throw createHttpError(error?.status || 500, { message: error?.message || "Something went wrong in updating admin" });
    }
};

export const updateAdminPassword = async (adminId: string, data: PasswordUpdate) => {
  try {
    const userData = await getAdminById(adminId);
    const passwordMatch = await isValidPassword(data.oldPassword?.trim(), userData?.password || "");
    if (!passwordMatch) {
      throw createHttpError(400, { message: "Current password mismatch" });
    }
    if (!data.newPassword.trim()) {
      throw createHttpError(400, { message: "New password must have some value" });
    }
    if (data.newPassword.trim() == data.oldPassword.trim()) {
      throw createHttpError(400, { message: "New password can't be same as current password" });
    }
    const admin = await Admin.findOneAndUpdate({ _id: adminId, isDeleted: false},
      { $set: { password: data.newPassword.trim() } }, 
      {
        new: true,
        projection: "-password -passwordResetToken",
    }).lean().exec();
    return admin;
  } catch (error: any) {
    throw createHttpError(error?.status || 500, { message: error?.message || "Something went wrong in updating admin pasword" });
  }
};

export const getAdminDashboard = async (adminId: string, payload: Partial<DashboardPayload>) => {
  try {
    const dateSearch: any = { };
    if(payload.from) {
      const startDateTime = moment(payload.from).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).format();
      dateSearch["createdAt"] = { $gte: startDateTime };
    }

    if(payload.to) {
        const endDateTime = moment(payload.to).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).format();
        dateSearch["createdAt"] = { ...dateSearch["createdAt"], $lte: endDateTime };
    }

    const users = await User.find({ isDeleted: false, ...dateSearch }).countDocuments();

    let paymentDetail = await Payment.aggregate([
      { $match: { isDeleted: false, status: PaymentTransactionStatus.SUCCESS, ...dateSearch } },
      { $group: { _id: null, amount: { $sum: "$amount"} } },
    ]);

    paymentDetail = paymentDetail[0];

    const calls = await Call.find( { ...dateSearch }).countDocuments();

    return { customers: users, payment: (paymentDetail as any)?.amount || 0, calls }

  } catch (error: any) {
    throw createHttpError(error?.status || 500, { message: error?.message || "Something went wrong in fetching admin dashboard data" });
  }
};

export const getCustomers = async (adminId: string, payload: Partial<CustomerPayload>) => {
  try {
    const pageFields = [{field: "pageIndex", defaultValue: 1}, {field: "pageSize", defaultValue: 10}]
    const { pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch } = parsePagination(JSON.stringify(payload), pageFields)
    const skipedUser = (pageIndexToSearch - 1)*pageSizeToSearch;
        

    let userSearch:any = { 
        isDeleted: false
    }

    const parsePayloadFields = ["firstName", "lastName", "phoneNumber", "countryCode"];
    const parsedPayload = parsePayload(JSON.stringify(payload), parsePayloadFields);
    userSearch = { ...userSearch, ...parsedPayload };

    const dateSearch: any = { };

    if(payload.from) {
      const startDateTime = moment(payload.from).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).format();
      dateSearch["createdAt"] = { $gte: startDateTime };
    }

    if(payload.to) {
        const endDateTime = moment(payload.to).set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).format();
        dateSearch["createdAt"] = { ...dateSearch["createdAt"], $lte: endDateTime };
    }

    const userCount = await User.find({...userSearch, ...dateSearch }).countDocuments();

    const users = await User.find({...userSearch, ...dateSearch },
      { otp: 0 }
    )
    .sort({ createdAt: -1 })
    .skip(skipedUser)
    .limit(pageSizeToSearch)
    .populate("credit")
    .lean().exec();

    return { customers: users, totalCount: userCount, pageCount: Math.ceil(userCount/pageSizeToSearch),
      pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: users.length
    };

  } catch (error: any) {
    throw createHttpError(error?.status || 500, { message: error?.message || "Something went wrong in fetching customer data" });
  }
};