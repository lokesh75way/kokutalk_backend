import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { parseExpireTime } from "./otp";
import createError from "http-errors";
import * as UserService from "./user";
import * as OtpService from "./otp";
import { IUser } from "../schema/User";

const TokenExpireTime = process.env.TOKEN_EXPIRATION_TIME || "24h";
interface JwtPayload {
  data: string;
  iat?: number;  // Issued at timestamp
  exp?: number;  // Expiration timestamp
}

export const initPassport = (): void => {
  passport.use(
    new Strategy(
      {
        secretOrKey: process.env.JWT_SECRET,
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      },
      async (token, done) => {
        try {
          done(null, token.user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
  
  // user login
  passport.use(
    "login",
    new LocalStrategy(
      {
        usernameField: "otp",
        passwordField: "otp",
      },
      async (username, otp, done) => {
        try {
          const otpData = await UserService.matchOtp(parseInt(otp));
          if (otpData?.length === 0 ) {
            done(createError(400, "Otp mismatch"), false);
            return;
          }
          if(otpData[0].expireAt.getTime() < Date.now()) {
            done(createError(400, "Otp expired. Please use new otp to verify"), false);
            return;
          }
          if(otpData[0].useCount >= otpData[0].useLimit) {
            done(createError(400, "Otp use limit exceeded. Please use new otp to verify"), false);
            return;
          }
          const user = await UserService.getUserById(otpData[0].userDetails?._id);
          if(!user?._id) {
            done(createError(400, "User deleted or doesn't exist with provided otp"), false);
            return;
          }
          const { otp: _otp, card: _card, invitedBy: _invitedBy, ...result } = user;
          await OtpService.updateOtp(otpData[0]);
          done(null, result, { message: "User verified for provided otp" });
        } catch (error: any) {
          done(createError(500, error.message));
        }
      }
    )
  );
};

export const decodeToken = (token: string) => {
  const jwtSecret = process.env.JWT_SECRET ?? "";
  const decode = jwt.verify(token, jwtSecret) as JwtPayload ;
  return decode ;
};

export const createUserToken = (user: Omit<IUser, "otp invitedBy card">, expirationTime?:string) => {
  const expireTime = parseExpireTime(expirationTime || TokenExpireTime)
  const jwtSecret = process.env.JWT_SECRET ?? "";
  const expiresIn = expireTime;
  const payload = {
    user:{
      _id : user._id,
      name : user?.name,
      phoneNumber : user.phoneNumber,
      countryCode : user.countryCode,
      status : user?.status,
      isDeleted : user.isDeleted,
      termsAgreed : user.termsAgreed,
      allowSmsNotification : user.allowSmsNotification,
      allowEmailNotification : user.allowEmailNotification,
      createdAt : user.createdAt,
      updatedAt : user.updatedAt,
      contact: user.contact,
      credit: user.credit
    }
  };
  const token = jwt.sign(payload, jwtSecret, {expiresIn});
  return { accessToken: token };
};

export const createToken = (data : string,expirationTime?:string) => {
  const expireTime = parseExpireTime(expirationTime || TokenExpireTime)
  const jwtSecret = process.env.JWT_SECRET ?? "";
  const expiresIn = expireTime;
  const payload = {data};
  const token = jwt.sign(payload, jwtSecret,{expiresIn});
  return { accessToken: token};
}