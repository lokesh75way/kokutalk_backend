import express, { type Express, type Request, type Response } from "express";
import bodyParser from "body-parser";
import morgan from "morgan";

import errorHandler from "./app/middleware/errorHandler";
import { initDB } from "./app/services/initDB";
import { initPassport } from "./app/services/passport-jwt";
import userRoutes from "./app/routes/user";
import contactRoutes from "./app/routes/contact";
import callRoutes from "./app/routes/call";
import notificationRoutes from "./app/routes/notification";
import creditRoutes from "./app/routes/credit";
import adminRoutes from "./app/routes/admin";
import callRateRoutes from "./app/routes/call-rate";
import paymentRoutes from "./app/routes/payment";
import fileRoutes from "./app/routes/fileUpload";
import { IUser } from "./app/schema/User";
import { loadConfig } from "./app/helper/config";
import swaggerUi from 'swagger-ui-express';
import { mergeSwaggerFiles } from "./mergeSwagger";
import cors from 'cors';
import { dialNumber, generateToken, makeCall, updateCallStatus } from "./app/services/call";
import Contact from "./app/schema/Contact";
const twilio = require("twilio");
const WebSocket = require("ws");
loadConfig();
import { authMiddleware } from "./app/middleware/auth";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "./app/helper/response";
import createHttpError from "http-errors";
import { IAdmin } from "./app/schema/Admin";

declare global {
  namespace Express {
    interface User extends Omit<IUser, "otp invitedBy card password"> {
      email?: string,
      password?: string,
      profileImage?: string
    }
    interface Request {
      user?: User;
    }
    
  }
}


const port = Number(process.env.PORT) ?? 5000;

const app: Express = express();
const router = express.Router();

const mergedSwagger = mergeSwaggerFiles();

app.set('trust proxy', 1)
const allowedOrigins: string[] = ["https://api.latecahub.com/kokutalk"];

app.use(cors({
  maxAge: 84600,
  origin: (origin, next) => {
    // console.log("========Req origin", origin)
    return next(null, true);
    // if (!origin) return next(null, true);

    // if (allowedOrigins.filter(curr => origin.includes(curr))?.length) {
    //   next(null, true);
    // } else {
    //   next(new Error('Not allowed by CORS'));
    // }
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(morgan("dev"));


// console.log("\n\n config detail", { accountSid, apiKeySid, apiKeySecret, serviceSid })

const initApp = async (): Promise<void> => {
  // init mongodb
  await initDB();

  // passport init
  initPassport();

  // set base path to /api
  app.use("/kokutalk", router);

  app.get("/", (req: Request, res: Response) => {
    res.send({ status: "ok" });
  });

  router.get("/token", authMiddleware, 
    expressAsyncHandler(async (req, res) => {
      const identity = req.body.identity || "user";
      const token = await generateToken(identity);
      res.send(createResponse(token, "Token generated successfully"));
    })
  )

  // Store the dialed number for use in /voice
  let dialedNumber = "";

  let dialingNumber = "";

  // /dial endpoint called from FE to update dailedNumber
  router.post("/dial", 
    authMiddleware,
    expressAsyncHandler( async (req, res) => {
       const { _to } = req.body;

       if(!_to) {
         throw createHttpError(400, { message: "_to is required", data: {} })
       }

       let existingCaller = await Contact.findOne({ _id: req?.user?.contact, isDeleted: false}).lean();
       
       dialingNumber = (existingCaller?.countryCode || "") + (existingCaller?.phoneNumber || "");

       dialedNumber = _to;
       
       const phoneNumber = dialedNumber.slice(-10);
       const countryCode = dialedNumber.slice(0, dialedNumber.length - 10);
       
       await makeCall(phoneNumber, countryCode, req.user!)

       res.send(createResponse({}, `Dialed number set to ${dialedNumber}`))

    })
  )

  router.post("/voice",
    expressAsyncHandler(async (req, res) => {
      const response = await dialNumber(dialedNumber, dialingNumber);
      res.type("text/xml");
      res.send(response.toString());
      // res.send(createResponse(response, `Dialed number set to ${dialedNumber}`));
    })
  );

  router.post("/call-status", 
    expressAsyncHandler(async (req, res) => {
      const callStatus = req.body.CallStatus;

      await updateCallStatus(req.body.CallSid)

      wss.clients.forEach((client:any) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(req.body));
        }
      });
      res.send(createResponse(callStatus, `Call status for ${req.body.CallSid} updated successulyys`));
    })
  );

  const env = process.env.NODE_ENV || "development";
  const documentPath = env == "local" ? __dirname : __dirname + "../..";
  // routes
  router.use("/users", userRoutes);
  router.use("/contacts", contactRoutes)
  router.use("/calls", callRoutes);
  router.use("/notifications", notificationRoutes);
  router.use("/credits", creditRoutes);
  router.use("/admins", adminRoutes);
  router.use("/call-rates", callRateRoutes);
  router.use("/payments", paymentRoutes);
  router.use("/file", fileRoutes);

  router.use("/documents", express.static(documentPath + "/documents/"));
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(mergedSwagger));

  // error handler
  app.use(errorHandler);

  const wss = new WebSocket.Server({ noServer: true });

  wss.on("connection", (ws:any) => {
    console.log("WebSocket connection established");

    ws.on("message", (message:any) => {
      console.log("Received message:", message);
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
    });
  });

  app.use(errorHandler);
  const server = app.listen(port, () => {
    console.log("App running on port", port);
  });

  

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws:any) => {
      wss.emit("connection", ws, request);
    });
  });
};

void initApp();
