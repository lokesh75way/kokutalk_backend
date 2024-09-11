import rateLimit from "express-rate-limit";
import { NextFunction, Request, Response } from 'express';
import BlockedIp from "../schema/BlockedIp";
import { loadConfig } from "../helper/config";
import jwt from "jsonwebtoken";
import { IUser } from "../schema/User";

loadConfig();

const windowMs = parseInt(process.env.RATE_LIMIT_SECONDS || "2", 10);
const max = parseInt(process.env.RATE_LIMIT_MAX_REQ || "10", 10);

const blockedIps = new Set();

const loadBlockedIps = async () => {
    const ips = await BlockedIp.find({ isBlocked: true }, { ip: true }).lean()
    ips.forEach(ip => { blockedIps.add(ip.ip) })
    console.log("Blocked ips loaded,", blockedIps.size)
}

loadBlockedIps()

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

const blocker = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getIp(req);
    if (blockedIps.has(clientIp)) {
        return res.status(403).send('Your IP has been permanently blocked.');
    }
    next();
}

// Configure the rate limit
const limiter = rateLimit({
    windowMs: windowMs * 1000,
    max: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        try {
            const clientIp = getIp(req);
            blockedIps.add(clientIp);
            BlockedIp.updateOne({ ip: clientIp }, { isBlocked: true }, { upsert: true }).then(console.log).catch(console.log)
            res.status(429).send('Too many requests. You have been permanently blocked.');
        } catch (error) {
            res.status(429).send('Too many requests. You have been permanently blocked.');
        }
        return;
    },
    skip: async (req: Request, res: Response) => {
        const rateLimitedApi = ["register", "login", "google", "facebook"]
        const url = req?.originalUrl?.split("?")[0];
        const apiRateLimited = rateLimitedApi.filter((curr) => url.includes(curr));
        return apiRateLimited?.length == 0;

    }
});

export const apiLimiter = [blocker, limiter];