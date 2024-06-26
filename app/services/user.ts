import User, { IUser } from "../schema/User";
import Otp, { IOtp } from "../schema/Otp";

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