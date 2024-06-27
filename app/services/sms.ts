import createHttpError from "http-errors";
import { loadConfig } from "../helper/config";
import twilio from "twilio";

loadConfig();

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const application = "kokutalk"
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

export const sendSms = async (otp: number, phoneNumber: string, action: string = "register"): Promise<any> => {
  try {
    
    if(!accountSid || !authToken || !twilioPhoneNumber || !phoneNumber) {
      throw createHttpError(500, { message: "Otp can't be sent by sms to user phone. Please check credential of message service provider and phone number." });
    }
    const client = twilio(accountSid, authToken);

    const message = await client.messages
    .create({
      body: `Your ${application} code for ${action} is ${otp}`,
      from: twilioPhoneNumber,
      to: phoneNumber
    })

  } catch (error: any) {
    throw createHttpError(500, { message: "Otp can't be sent by sms to user phone. Please check credential of message service provider and phone number." });
  }
};


export const sendOtp = async (otp: number, phoneNumber: string, action: string = "register") =>  {
  try {
    await sendSms(otp, phoneNumber, action);
  } catch (error: any) {
    throw createHttpError(500, { message: "Otp can't be sent by sms to user phone. Please check credential of message service provider and phone number." });
  }
}