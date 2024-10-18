import Notification, { INotification } from "../schema/Notification";
import createHttpError from "http-errors";
import { escapeRegex } from "../helper/common";
import mongoose from "mongoose";
import moment = require("moment-timezone");
import User from "../schema/User";

interface NotificationPayload {
    entityType?: string,
    entityTypeId?: string,
    message?: string,
    isSeen?: boolean,
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
    userId?: string | null;
    from?: string | null;
    to?: string | null;
}

export const saveNotification = async (userId: string, data: Partial<INotification>) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { userId, entityType: data.entityType, entityTypeId: data.entityTypeId,
             isDeleted: false, isSeen: false,            },
            { $setOnInsert: {
              ...data, userId
            }},
            {
                new: true,
                upsert: true
            }
        );

        return { notification };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in saving notification." });
    }
};

export const updateNotification = async (userId: string, notificationId: string, data: Partial<INotification>) => {
    try {
        const notification = await Notification.findOneAndUpdate({ _id: notificationId, userId, isDeleted: false }, 
            { $set: { ...data, seenAt: new Date(Date.now()) } }, {
            new: true,
        }).lean().exec();

        return { notification };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in updating notification." });
    }
};

export const getNotification = async (userId: string, payload: NotificationPayload) => {
    try {
        const { pageIndex = "", pageSize = "", isSeen = false,  message = "", entityType = "", entityTypeId = "" } = payload;

        let pageIndexToSearch = pageIndex && !Number.isNaN(pageIndex) ? parseInt(pageIndex + "") : 1;
        let pageSizeToSearch = pageSize && !Number.isNaN(pageSize) ? parseInt(pageSize + "") : 10;
        pageIndexToSearch = pageIndexToSearch > 0 ? pageIndexToSearch : 1;
        pageSizeToSearch = pageSizeToSearch > 0 ? pageSizeToSearch : 10;
        const skipedNotification = (pageIndexToSearch - 1)*pageIndexToSearch;

        const notificationSearch:any = { 
            isDeleted: false, 
            // isSeen
        }

        if(mongoose.isObjectIdOrHexString(userId)) {
            notificationSearch["userId"] = userId;
        }

        if(message) {
            notificationSearch["message"] = new RegExp(escapeRegex(message), 'i')
        }

        if(entityType) {
            notificationSearch["entityType"] = new RegExp(escapeRegex(entityType), 'i')
        }

        if(entityTypeId) {
            notificationSearch["entityTypeId"] = new RegExp(escapeRegex(entityTypeId), 'i')
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

        const notificationCount = await Notification.find({...notificationSearch, ...dateSearch}).countDocuments();
        const notifications = await Notification.find({...notificationSearch, ...dateSearch}).sort({ createdAt: -1 }).skip(skipedNotification).limit(pageSizeToSearch)
        .populate("userId", "-otp").lean().exec();

        return { notifications, totalCount: notificationCount, pageCount: Math.ceil(notificationCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: notifications.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching notifications." });
    }
    
};

export const getNotificationById = async (userId: string, notificationId: string) => {
    try {
        const notificationSearch:any = { 
            isDeleted: false, 
            _id: notificationId
        }
        if(mongoose.isObjectIdOrHexString(userId)) {
            notificationSearch["userId"] = userId;
        }
        const notification = await Notification.findOne(notificationSearch)
        .populate("userId", "-otp").lean().exec();
        if(!notification?._id) {
            throw createHttpError(404, { message: "Notification is either deleted or doesn't exist." });
        }
        return { notification };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching notification by id." });
    }
};

export const sendNotification = async (userId: string, data: Partial<INotification>) => {
    try {

        const users = await User.find({ }).lean().exec();

        const notifications = [];

        for(let user of users) {
           notifications.push({...data, "userId": user?._id, sentBy: userId, 
            entityType: "New notification"
            })
        }

        if(notifications.length) {
            await Notification.insertMany(notifications); 
        }

        return { };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in sending notification." });
    }
};

