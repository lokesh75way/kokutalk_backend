import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import createHttpError from "http-errors";
import { loadConfig } from "../helper/config";

loadConfig();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
});

export const sendEmail = async (mailOptions: Mail.Options): Promise<any> => {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error: any) {
      console.log("========Email transport sent", error)
      createHttpError(500, { message: error.message });
    }
};

export const otpEmailTemplate = (userName: string, otp : string) => `
<html>
  <body>
    <p>Hi ${userName}, We received a request to reset your password for your Kokutalk admin account.
    <br> Your One-Time Password (OTP) is: ${otp}.
    <br> Please use this OTP to reset your password within the next 20 minutes.
    <br> If you did not request this, please disregard this email or contact our support team immediately.
    </p>
    <p> For any questions, please contact our support team.
    </p>
    <p> Best,
    <br> Kokutalk Team </p>
  </body>
</html>`;


export const sendOtp = async (email: string, userName: string, otp: string) =>  {
  await sendEmail({
    to: email,
    subject: "Kokutalk - Password Reset Request",
    html: otpEmailTemplate(userName, otp),
  });
  return otp;
}