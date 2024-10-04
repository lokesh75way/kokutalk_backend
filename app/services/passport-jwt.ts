import jwt from "jsonwebtoken";
import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy, ExtractJwt } from "passport-jwt";
import { Strategy as LocalStrategy } from "passport-local";
import { parseExpireTime } from "./otp";
import createError from "http-errors";
import * as UserService from "./user";
import * as AdminService from "./admin";
import * as OtpService from "./otp";
import { IUser } from "../schema/User";
import { IToken } from "../schema/Token";
import { IAdmin } from "../schema/Admin";
import { saveSessionToken } from "./token";

const AccessTokenExpireTime = process.env.ACCESS_TOKEN_EXPIRATION_TIME || "24h";
const RefreshTokenExpireTime  = process.env.REFRESH_TOKEN_EXPIRATION_TIME || '7d'
interface JwtPayload {
  data: string;
  iat?: number;  // Issued at timestamp
  exp?: number;  // Expiration timestamp
}

export const isValidPassword = async function (value: string, password: string) {
  const compare = await bcrypt.compare(value, password);
  return compare;
};

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
          done(null, result as IUser, { message: "User verified for provided otp" });
        } catch (error: any) {
          done(createError(500, error.message));
        }
      }
    )
  );

  // admin login
  passport.use(
    "admin-login",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const admin = await AdminService.getAdminByEmail(email);
          if (!admin?._id) {
            done(createError(400, "Admin not registered."), false);
            return;
          }
          const validate = await isValidPassword(password?.trim(), admin?.password?.trim());
          if (!validate) {
            done(createError(400, "Password mismatch"), false);
            return;
          }
          const { password: _p, ...result } = admin;
          done(null, {...result, contact: null}, { message: "Logged in Successfully"});
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

export const createUserToken = async(user: Omit<IUser, "otp invitedBy card">, 
  accessTokenExpirationTime?: string,
  refreshTokenExpirationTime?: string,
) => {
  const accessTokenExpireTime = parseExpireTime(accessTokenExpirationTime || AccessTokenExpireTime);
  const refreshTokenExpireTime = parseExpireTime(refreshTokenExpirationTime || RefreshTokenExpireTime);
  const jwtSecret = process.env.JWT_SECRET ?? "";
  const accessTokenExpiresIn = accessTokenExpireTime;
  const refreshTokenExpiresIn = refreshTokenExpireTime;
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
  const accessToken = jwt.sign(payload, jwtSecret, {expiresIn: accessTokenExpiresIn });
  const refreshToken = jwt.sign({ user: { _id: user?._id } }, jwtSecret, {expiresIn: refreshTokenExpiresIn });
  const expireAt = new Date(Date.now() + accessTokenExpireTime * 1000);
  await saveSessionToken("", user?._id || "", { value: accessToken, expireAt, refreshToken })
  return { accessToken, refreshToken };
};

export const createAdminToken = async (
  user: Omit<IAdmin, "password"> | Omit<IUser, "otp invitedBy card">,
  accessTokenExpirationTime?: string,
  refreshTokenExpirationTime?: string,
) => {
  const accessTokenExpireTime = parseExpireTime(accessTokenExpirationTime || AccessTokenExpireTime);
  const refreshTokenExpireTime = parseExpireTime(refreshTokenExpirationTime || RefreshTokenExpireTime);

  const jwtSecret = process.env.JWT_SECRET ?? "";
  const accessTokenExpiresIn = accessTokenExpireTime;
  const refreshTokenExpiresIn = refreshTokenExpireTime;
  const payload = {
    user: {
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
      email: (user as IAdmin)?.email
    },
  };
  const accessToken = jwt.sign(payload, jwtSecret, {expiresIn: accessTokenExpiresIn });
  const refreshToken = jwt.sign({ user: { _id: user?._id } }, jwtSecret, {expiresIn: refreshTokenExpiresIn });
  const expireAt = new Date(Date.now() + accessTokenExpireTime * 1000);
  await saveSessionToken(user?._id || "", "", { value: accessToken, expireAt, refreshToken })
  return { accessToken, refreshToken };
};