import Notification, { INotification } from "../schema/Notification";
import createHttpError from "http-errors";
import { escapeRegex } from "../helper/common";
import mongoose from "mongoose";
import moment = require("moment-timezone");
import User from "../schema/User";
import { parsePagination } from "../helper/common";

interface NotificationPayload {
    entityType?: string,
    entityTypeId?: string,
    message?: string,
    title?: string,
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
             isDeleted: false },
            { $setOnInsert: {
              ...data, userId, id: new mongoose.Types.ObjectId(),
              sentAt: new Date()
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
        const notification = await Notification.findOneAndUpdate({ id: notificationId, userId, isDeleted: false }, 
            { $set: { isSeen: true, seenAt: new Date(Date.now()) } }, {
            new: true,
        }).lean().exec();

        return { notification };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in updating notification." });
    }
};

export const getNotification = async (userId: string, payload: NotificationPayload) => {
    try {
        const { pageIndex = "", pageSize = "", isSeen = false,  message = "", entityType = "", entityTypeId = "", title = "" } = payload;

        const pageFields = [{field: "pageIndex", defaultValue: 1}, {field: "pageSize", defaultValue: 10}]
        const { pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch } = parsePagination(JSON.stringify(payload), pageFields)
        const skipedNotification = (pageIndexToSearch - 1)*pageSizeToSearch;

        const notificationSearch:any = { 
            isDeleted: false, 
            //isSeen
        }

        if(mongoose.isObjectIdOrHexString(userId)) {
            notificationSearch["userId"] = new mongoose.Types.ObjectId(userId);
        }

        if(message) {
            notificationSearch["message"] = new RegExp(escapeRegex(message), 'i')
        }

        if(title) {
            notificationSearch["title"] = new RegExp(escapeRegex(title), 'i')
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

        const notificationCountDetail = await Notification.aggregate([
            { $match: {...notificationSearch, ...dateSearch} },
            { $group: { _id: "$id",
                ids: { $push: "$_id" }
             } },
             { $count: "notifications" }
        ]).allowDiskUse(true);

        const notificationSeenCountDetail = await Notification.aggregate([
            { $match: {...notificationSearch, ...dateSearch, isSeen: true } },
            { $group: { _id: "$id",
                ids: { $push: "$_id" }
             } },
             { $count: "notifications" }
        ]).allowDiskUse(true);

        const notificationCount = notificationCountDetail[0]?.notifications || 0;
        const seenNotificationCount = notificationSeenCountDetail[0]?.notifications || 0;

        const userSearch:any = { isDeleted: false };
        const users = await User.find(userSearch).lean().exec();

        const notifications = await Notification.aggregate([
            {$match: {...notificationSearch, ...dateSearch} },
            { $group: { _id: "$id",
                entityType: { $first: "$entityType" },
                entityTypeId: { $first: "$entityTypeId" },
                status: { $first: "$status" },
                message: { $first: "$message" },
                title: { $first: "$title" },
                sentBy: { $first: "$sentBy" },
                id: { $first: "$id" },
                isSeen: { $first: "$isSeen" },
                seenAt: { $first: "$seenAt" },
                sentAt: { $first: "$sentAt" },
                createdAt: { $first: "$createdAt" },
                isDeleted: { $first: "$isDeleted" },
                userNotifications: { $push: { 
                    _id: "$_id", 
                    isSeen: "$isSeen", seenAt: "$seenAt",
                    createdAt: "$createdAt", updatedAt: "$updatedAt",
                    userId: {
                        $mergeObjects: [
                            { $first: { $filter: {
                                input: users,
                                as: "currUser",
                                cond: { $and: [
                                    { $eq: ["$$currUser._id", "$userId"] },
                                ] }
                            }} },
                            { otp: 0 }
                        ]
                    } 
                } }
             } },
             { $sort: { createdAt: -1 } },
             { $skip: skipedNotification },
             { $limit: pageSizeToSearch }, 
        ])

        return { notifications, seenNotificationCount, unseenNotificationCount: (notificationCount - seenNotificationCount), totalCount: notificationCount, pageCount: Math.ceil(notificationCount/pageSizeToSearch),
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

export const sendNotification = async (userId: string, data: Partial<INotification>, customers: string[] = []) => {
    try {
        const userSearch:any = { isDeleted: false };
        if(customers.length) {
            userSearch["_id"] = { $in: customers }
        }
        const users = await User.find(userSearch).lean().exec();

        const notifications = [];

        data["id"] = new mongoose.Types.ObjectId();
        data["sentAt"] = new Date();

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

