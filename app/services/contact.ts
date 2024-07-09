import Contact, { IContact } from "../schema/Contact";
import User from "../schema/User";
import createHttpError from "http-errors";
import { loadConfig } from "../helper/config";
import { escapeRegex } from "../helper/common";

loadConfig();

interface ContactPayload {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    countryCode?: string | null;
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
}

export const addContact = async (userId: string, data: Partial<IContact>) => {
    try {
        const existingUser = await User.findOne({ 
            phoneNumber: data?.phoneNumber, countryCode: data?.countryCode, isDeleted: false
        }).lean();

        const contact = await Contact.findOneAndUpdate({ 
            createdBy: userId, isDeleted: false,
            phoneNumber: data?.phoneNumber, countryCode: data?.countryCode,
            userId: existingUser?._id
         }, { 
            $set: {
                firstName: data?.firstName,
                lastName: data?.lastName,
                phoneNumber: data?.phoneNumber,
                countryCode: data?.countryCode
            },
            $setOnInsert: {
               createdBy: userId,
               userId: existingUser?._id
            }
        }, {
            new: true,
            upsert: true
        }).lean().exec();

        return { contact };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in adding contact." });
    }
};

export const updateContact = async (userId: string, contactId: string, data: Partial<IContact>) => {
    try {
        const contact = await Contact.findOneAndUpdate({ _id: contactId, createdBy: userId, isDeleted: false }, 
            { $set: { ...data, updatedBy: userId } }, {
            new: true,
        }).lean().exec();

        return { contact };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in updating contact." });
    }
};

export const getContact = async (userId: string, payload: ContactPayload) => {
    try {
        const { pageIndex = "", pageSize = "", firstName = "", lastName = "", phoneNumber = "", countryCode = "" } = payload;
        
        let pageIndexToSearch = pageIndex && !Number.isNaN(pageIndex) ? parseInt(pageIndex + "") : 1;
        let pageSizeToSearch = pageSize && !Number.isNaN(pageSize) ? parseInt(pageSize + "") : 10;
        pageIndexToSearch = pageIndexToSearch > 0 ? pageIndexToSearch : 1;
        pageSizeToSearch = pageSizeToSearch > 0 ? pageSizeToSearch : 10;
        const skipedContact = (pageIndexToSearch - 1)*pageIndexToSearch;

        const contactSearch:any = { 
            createdBy: userId, isDeleted: false, 
            $and: [
            { firstName: { $nin: ["", null ] } },
            { lastName: { $nin: ["", null ] } } 
            ]
        }

        if(firstName) {
            contactSearch["firstName"] = new RegExp(escapeRegex(firstName), 'i')
        }
        if(lastName) {
            contactSearch["lastName"] = new RegExp(escapeRegex(lastName), 'i')
        }
        if(phoneNumber) {
            contactSearch["phoneNumber"] = new RegExp(escapeRegex(phoneNumber), 'i')
        }
        if(countryCode) {
            contactSearch["countryCode"] = new RegExp(escapeRegex(countryCode), 'i')
        }

        const contactCount = await Contact.find(contactSearch).countDocuments();
        const contacts = await Contact.find(contactSearch).sort({ createdAt: -1 }).skip(skipedContact).limit(pageSizeToSearch).lean().exec();

        return { contacts, totalCount: contactCount, pageCount: Math.ceil(contactCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: contacts.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching contact list." });
    }
    
};

export const getContactById = async (userId: string, contactId: string) => {
    try {
        const contactSearch = { 
            createdBy: userId, isDeleted: false, 
            _id: contactId
        }
        const contact = await Contact.findOne(contactSearch).lean().exec();
        if(!contact?._id) {
            throw createHttpError(404, { message: "Contact is either deleted or doesn't exist." });
        }
        return { contact };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching contact by id." });
    }
};

export const deleteContact = async (userId: string, contactId: string) => {
    try {
        const contact = await Contact.findOneAndUpdate({ _id: contactId, createdBy: userId, isDeleted: false }, 
            { $set: { isDeleted: true, deletedAt: new Date(Date.now()), deletedBy: userId } }, {
            new: true,
        }).lean().exec();

        return { contact };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in deleting contact." });
    }
};

