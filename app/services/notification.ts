import Notification, { INotification } from "../schema/Notification";
import createHttpError from "http-errors";
import { escapeRegex } from "../helper/common";

interface NotificationPayload {
    entityType?: string,
    entityTypeId?: string,
    message?: string,
    isSeen?: boolean,
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
}

export const saveNotification = async (userId: string, data: Partial<INotification>) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { userId, entityTypeId: data.entityTypeId, 
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
        const contact = await Notification.findOneAndUpdate({ _id: notificationId, userId, isDeleted: false }, 
            { $set: { ...data, seenAt: new Date(Date.now()) } }, {
            new: true,
        }).lean().exec();

        return { contact };

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
            userId, isDeleted: false, isSeen
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

        const notificationCount = await Notification.find(notificationSearch).countDocuments();
        const notifications = await Notification.find(notificationSearch).sort({ createdAt: -1 }).skip(skipedNotification).limit(pageSizeToSearch).lean().exec();

        return { notifications, totalCount: notificationCount, pageCount: Math.ceil(notificationCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: notifications.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching notifications." });
    }
    
};

export const getNotificationById = async (userId: string, notificationId: string) => {
    try {
        const notificationSearch = { 
            userId, isDeleted: false, 
            _id: notificationId
        }
        const notification = await Notification.findOne(notificationSearch).lean().exec();
        if(!notification?._id) {
            throw createHttpError(404, { message: "Notification is either deleted or doesn't exist." });
        }
        return { notification };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching notification by id." });
    }
};

