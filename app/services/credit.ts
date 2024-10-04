import createHttpError from "http-errors";
import Credit, { ICredit} from "../schema/Credit";
import { CURRENCY } from "../schema/Payment";

interface CreditPayload {
    pageIndex?: string | number | null;
    pageSize?: string | number | null;
}

export const addCredit = async (userId: string, data: Partial<ICredit>) => {
    try {  
      const userCredit = await Credit.findOneAndUpdate(
        { usedBy: userId, isDeleted: false },
        {
          $inc: { totalAmount: data?.totalAmount, remainingAmount: data?.remainingAmount  },
          $setOnInsert: {
            usedBy: userId,
            currency: data.currency || CURRENCY.USD,
          }
        },
        { new: true, upsert: true }
      ).lean().exec();

      return userCredit;

    } catch (error) {
        throw createHttpError(500, { message: "Something went wrong in adding credit for user." });
    }
};

export const getCredit = async (userId: string, payload: CreditPayload) => {
    try {
        const { pageIndex = "", pageSize = "" } = payload;

        let pageIndexToSearch = pageIndex && !Number.isNaN(pageIndex) ? parseInt(pageIndex + "") : 1;
        let pageSizeToSearch = pageSize && !Number.isNaN(pageSize) ? parseInt(pageSize + "") : 10;
        pageIndexToSearch = pageIndexToSearch > 0 ? pageIndexToSearch : 1;
        pageSizeToSearch = pageSizeToSearch > 0 ? pageSizeToSearch : 10;
        const skipedCredit = (pageIndexToSearch - 1)*pageIndexToSearch;

        const creditSearch:any = { 
            usedBy: userId, isDeleted: false
        }

        const creditCount = await Credit.find(creditSearch).countDocuments();
        const credits = await Credit.find(creditSearch).sort({ createdAt: -1 }).skip(skipedCredit).limit(pageSizeToSearch).lean().exec();

        return { credits, totalCount: creditCount, pageCount: Math.ceil(creditCount/pageSizeToSearch),
            pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, count: credits.length
        };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching credits." });
    }
    
};

export const getCreditById = async (userId: string, creditId: string) => {
    try {
        const creditSearch = { 
            usedBy: userId, isDeleted: false, 
            _id: creditId
        }
        const credit = await Credit.findOne(creditSearch).lean().exec();
        if(!credit?._id) {
            throw createHttpError(404, { message: "Credit is either deleted or doesn't exist." });
        }
        return { credit };
    } catch(error) {
        throw createHttpError(500, { message: "Something went wrong in fetching credit by id." });
    }
};