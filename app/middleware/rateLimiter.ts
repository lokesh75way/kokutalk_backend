import rateLimit from "express-rate-limit";
import { NextFunction, Request, Response } from 'express';
import BlockedIp from "../schema/BlockedIp";
import { loadConfig } from "../helper/config";
import jwt from "jsonwebtoken";
import { IUser } from "../schema/User";

loadConfig();

const windowMs = parseInt(process.env.RATE_LIMIT_MINUTES || "5", 10);
const max = parseInt(process.env.RATE_LIMIT_MAX_REQ || "20", 10);

const getIp = (req: Request) => {
    let ip = req.headers['x-forwarded-for'] as string || req.socket["remoteAddress"]?.split(",")[0] || req.ip || "";
    ip = ip.replace(/:\d+[^:]*$/, '')
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            const decodedUser = jwt.verify(token, process.env.JWT_SECRET!) as IUser;
            if (decodedUser && decodedUser?._id) {
                ip += "_" + decodedUser?._id
            }
        }
    } catch (error: any) {
        console.log(error.message)
    }
    return ip;
}

// Configure the rate limit
const limiter = rateLimit({
    windowMs: windowMs * 60 * 1000,
    max: max * windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        try {
            res.status(429).send('Too many requests. You have been blocked. Please try after 5 minutes.');
        } catch (error) {
            res.status(429).send('Too many requests. You have been permanently blocked. Please try after 5 minutes.');
        }
        return;
    },
    skip: async (req: Request, res: Response) => {
        const rateLimitedApi = ["send-otp", "verify-otp", "google", "facebook"]
        const url = req?.originalUrl?.split("?")[0];
        const apiRateLimited = rateLimitedApi.filter((curr) => url.includes(curr));
        return apiRateLimited?.length == 0;

    },
    keyGenerator: (req: Request, res: Response) => {
        return getIp(req)
    }
});

export const apiLimiter = [limiter];