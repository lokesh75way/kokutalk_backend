import Card, { ICard } from "../schema/Card";
import createHttpError from "http-errors";
import { parsePagination, parsePayload } from "../helper/common";
import { IUser } from "../schema/User";
import { attachPaymentMethodToCustomer, createCustomer, createPaymentMethod, detachPaymentMethodFromCustomer, getCustomer, getPaymentMethodById, listPaymentMethods, stripeErrorMessage, updateDefaultPaymentMethod } from "../helper/stripe";
import { getUserById, updateUser } from "./user";
import mongoose from "mongoose";

interface CardListPayload {
  pageIndex?: string | number | null;
  pageSize?: string | number | null;
}

interface CardPayload {
  id: string
}

export const createCard = async (userId: String, data: any) => {
    try {
      const userData = await getUserById(userId?.toString() || "");
      let { name,  customerId = "" } = userData || {};
      customerId = userData?.customerId || "";
      if(!customerId) {
        const { id } = await createCustomer({ email: "", name, address: {} });
        customerId = id;
      }
      const cardDetail = await createPaymentMethod({card:data});

      const addedCard = await Card.findOneAndUpdate({ userId, isDeleted: false, cardId:cardDetail?.id },
        { $setOnInsert: { userId, cardId: cardDetail?.id, },
          $set: { updatedBy: userId } },
        { upsert: true, new: true }
      ).lean().exec();

      let { data: payment_methods } = await listPaymentMethods(customerId);
      await attachPaymentMethodToCustomer(cardDetail?.id, customerId);
      if(!payment_methods || !payment_methods.length){
        await updateDefaultPaymentMethod(customerId, cardDetail?.id);
        await updateUser(userId?.toString() || "", { customerId, card: addedCard?._id ? new mongoose.Types.ObjectId(addedCard?._id) : null })
        cardDetail["isPrimary"] = true;
        cardDetail["_id"] = addedCard?._id;
      }
      
      return { card: cardDetail };
    } catch (error:any) {
        const errorMessage = error?.message || "Something went wrong in creating card.";
        throw createHttpError(error?.status || 500, { message: errorMessage });
    }
};

export const addCard = async (userId: String, data: CardPayload) => {
    try {
      const userData = await getUserById(userId?.toString() || "");
      let { name,  customerId = "" } = userData || { };
      customerId = userData?.customerId || "";
      if(!customerId) {
        const { id } = await createCustomer({ email: "", name, address: {} });
        customerId = id;
      }
      let { data: payment_methods } = await listPaymentMethods(customerId);
      let cardAdded = await attachPaymentMethodToCustomer(data.id, customerId);
      
      const addedCard = await Card.findOneAndUpdate({ userId, isDeleted: false, cardId:data.id },
        { $setOnInsert: { userId, cardId: data.id, },
        $set: { updatedBy: userId } },
        { upsert: true, new: true }
      ).lean().exec();
      
      if(!payment_methods || !payment_methods.length){
         await updateDefaultPaymentMethod(customerId, data.id);
         await updateUser(userId?.toString() || "", { customerId, card: addedCard?._id ? new mongoose.Types.ObjectId(addedCard?._id) : null });
         cardAdded["isPrimary"] = true;
         cardAdded["_id"] = addedCard?._id;
      }
      return { card: cardAdded };
    } catch (error:any) {
        const errorMessage = error?.message || "Something went wrong in adding card.";
        throw createHttpError(error?.status || 500, { message: errorMessage });
    }
};

export const addPrimaryCard = async (userId: string, data: CardPayload) => {
    try {
      const userData = await getUserById(userId?.toString() || "");
      let { name,  customerId = "" } = userData || { };
      if(!customerId) {
        const { id } = await createCustomer({ email: "", name, address: {} });
        customerId = id;
      }
      let cardAdded = await attachPaymentMethodToCustomer(data.id, customerId);
      await updateDefaultPaymentMethod(customerId, data.id);

      const addedCard = await Card.findOneAndUpdate({ userId, isDeleted: false, cardId:data.id },
        { $setOnInsert: { userId, cardId: data.id, },
          $set: { updatedBy: userId },
        },
        { upsert: true, new: true }
      ).lean().exec();

      cardAdded["isPrimary"] = true;
      cardAdded["_id"] = addedCard?._id;

      await updateUser(userId?.toString() || "", { customerId, card: addedCard?._id ? new mongoose.Types.ObjectId(addedCard?._id) : null })
      return { card: cardAdded };
    } catch (error:any) {
        const errorMessage = error?.message || "Something went wrong in adding primary card.";
        throw createHttpError(error?.status || 500, { message: errorMessage });
    }
};

export const getCard = async (userId: string, payload: CardListPayload) => {
    try {
      const userData = await getUserById(userId?.toString() || "");
      const customerId = userData?.customerId || "";
      const pageFields = [{field: "pageIndex", defaultValue: 1}, {field: "pageSize", defaultValue: 10}]
      const { pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch } = parsePagination(JSON.stringify(payload), pageFields);
      
      if(!customerId) {
        return { cards: [],totalCount: 0, pageCount: pageIndexToSearch, pageSize: pageSizeToSearch, count: 0 };
      }

      const primaryCard = userData?.card || "";
      const cardDetails = await Card.find({ userId, isDeleted: false }).lean().exec();
      const skipedCard = (pageIndexToSearch - 1)*pageSizeToSearch;

      let { data: cards } = await listPaymentMethods(customerId);
      cards = cards.filter((curr: any) => curr.type == "card").sort((a:any, b:any) => b.created - a.created );
      const cardCount = cards.length;
      cards = cards.slice(skipedCard, pageSizeToSearch);
      
      cards = cards.map((curr:any) => {  
        const currCardDetail = cardDetails.find((currCard: ICard) => currCard.cardId == curr.id)
        return { ...curr, _id: currCardDetail?._id, isPrimary: currCardDetail?._id?.toString() == primaryCard?.toString(), isVerified: currCardDetail?.isVerified || false }
      })

      return { 
        cards, totalCount: cardCount, 
        pageCount: Math.ceil(cardCount/pageSizeToSearch),
        pageIndex: pageIndexToSearch, pageSize: pageSizeToSearch, 
        count: cards.length 
      };
    } catch (error:any) {
        const errorMessage = error?.message || "Something went wrong in fetching card list.";
        throw createHttpError(error?.status || 500, { message: errorMessage });
    }
};

export const getCardById = async (userId: string, cardId: string) => {
    try {
      const userData = await getUserById(userId?.toString() || "");
      const customerId = userData?.customerId || "";
      const primaryCard = userData?.card || "";
      if(!customerId) {
        return { card: null };
      }

      const cardAdded = await Card.findOne({ userId, isDeleted: false, _id: cardId }).lean().exec()
      if(!cardAdded?._id) {
        throw createHttpError(400, { message: "Detail of provided card not found for logged in user." });
      }

      const cardDetail:any = await getPaymentMethodById(cardAdded.cardId);
      if(customerId != cardDetail?.customer) {
        throw createHttpError(400, { message: "Provided card is not linked to logged in user." });
      }

      return { card: { ...cardDetail, 
            _id: cardId, isVerified: cardAdded.isVerified, 
           isPrimary: primaryCard?.toString() == cardId 
        } 
      };
    } catch (error:any) {
        const errorMessage = error?.message || "Something went wrong in fetching card detail.";
        throw createHttpError(error?.status || 500, { message: errorMessage });
    }
};

export const deleteCard = async (userId: string, cardId: string) => {
    try {
      const userData = await getUserById(userId?.toString() || "");
      const customerId = userData?.customerId || "";
      const primaryCard = userData?.card || ""
      if(!customerId) {
        return { card: null };
      }

      const cardAdded = await Card.findOne({ userId, isDeleted: false, _id: cardId }).lean().exec()
      if(!cardAdded?._id) {
        throw createHttpError(400, { message: "Detail of provided card not found for logged in user." });
      }

      const cardDetail:any = await getPaymentMethodById(cardAdded.cardId);
      if(customerId != cardDetail?.customer) {
        throw createHttpError(400, { message: "Provided card is not linked to logged in user." });
      }

      await detachPaymentMethodFromCustomer(cardAdded.cardId);
      await Card.findOneAndUpdate({ userId, _id: cardId, isDeleted: false },
        { $set: { isDeleted: true, deletedBy: userId, deletedAt: new Date() }},
        { new: true }
      )
      if(primaryCard?.toString() == cardId) {
        await updateUser(userId?.toString() || "", { card: null } );
      }
      return { card: null };
    } catch (error:any) {
        const errorMessage = error?.message || "Something went wrong in deleting card.";
        throw createHttpError(error?.status || 500, { message: errorMessage });
    }
};