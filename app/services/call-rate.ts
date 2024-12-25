import CallRate, { ICallRate } from "../schema/CallRate";
import Admin, { IAdmin } from "../schema/Admin";
import createHttpError from "http-errors";
import { loadConfig } from "../helper/config";
import { escapeRegex, parsePagination, parsePayload } from "../helper/common";
import Call from "../schema/Call";

loadConfig();

interface CallRatePayload {
    fromCountryCode?: string | null;
    toCountryCode?: string | null;
    fromCountryName?: string | null;
    toCountryName?: string | null;
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
}

export const addCallRate = async (adminId: string, data: Partial<ICallRate>) => {
    try {
        const countryCodeSearch = parsePayload(JSON.stringify({ fromCountryCode: data.fromCountryCode, toCountryCode: data.toCountryCode }), ["fromCountryCode", "toCountryCode"])
        const callRate = await CallRate.findOneAndUpdate({ 
            ...countryCodeSearch,
            isDeleted: false,
         }, { 
            $set: {
                ...data,
                updatedBy: adminId
            },
            $setOnInsert: {
               createdBy: adminId
            }
        }, {
            new: true,
            upsert: true
        }).lean().exec();

        return { callRate };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in adding call rate." });
    }
};

export const updateCallRate = async (adminId: string, callRateId: string, data: Partial<ICallRate>) => {
    try {
        const callRate = await CallRate.findOneAndUpdate({ _id: callRateId, isDeleted: false }, 
            { $set: { ...data, updatedBy: adminId } }, {
            new: true,
        }).lean().exec();

        return { callRate };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in updating call rate." });
    }
};

export const getCallRate = async (userId: string, payload: CallRatePayload) => {
    try {
        const pageFields = [{field: "pageIndex", defaultValue: 1}, {field: "pageSize", defaultValue: 10}]
        const { pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch } = parsePagination(JSON.stringify(payload), pageFields)
        const skipedCallRate = (pageIndexToSearch - 1)*pageSizeToSearch;
        

        let callRateSearch:any = { 
            isDeleted: false
        }

        const parsePayloadFields = ["fromCountryCode", "toCountryCode", "fromCountryName", "toCountryName"];
        const parsedPayload = parsePayload(JSON.stringify(payload), parsePayloadFields);
        callRateSearch = { ...callRateSearch, ...parsedPayload };

        const callRateCount = await CallRate.find(callRateSearch).countDocuments();
        const callRates = await CallRate.find(callRateSearch).sort({ createdAt: -1 }).skip(skipedCallRate).limit(pageSizeToSearch).lean().exec();

        return { callRates, totalCount: callRateCount, pageCount: Math.ceil(callRateCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: callRates.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching call rate list." });
    }
    
};

export const getCallRateById = async (userId: string, callRateId: string) => {
    try {
        const callRateSearch = { 
            isDeleted: false, 
            _id: callRateId
        }
        const callRate = await CallRate.findOne(callRateSearch).lean().exec();
        if(!callRate?._id) {
            throw createHttpError(400, { message: "Call rate is either deleted or doesn't exist." });
        }
        return { callRate };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching call rate by id." });
    }
};

export const deleteCallRate = async (userId: string, callRateId: string) => {
    try {
        const callRate = await CallRate.findOneAndUpdate({ _id: callRateId, isDeleted: false }, 
            { $set: { isDeleted: true, deletedAt: new Date(Date.now()), deletedBy: userId } }, {
            new: true,
        }).lean().exec();

        return { callRate };

    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in deleting call rate." });
    }
};