import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import Token, { TokenType } from "../schema/Token";
import Admin, { IAdmin } from "../schema/Admin";

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
export const matchAdminToken = async(token:string, type: TokenType.PasswordReset | TokenType.OtpVerification | TokenType.Access)  => {
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