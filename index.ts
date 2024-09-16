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
import { IUser } from "./app/schema/User";
import { loadConfig } from "./app/helper/config";
import swaggerUi from 'swagger-ui-express';
import { mergeSwaggerFiles } from "./mergeSwagger";
import cors from 'cors';
const twilio = require("twilio");
const WebSocket = require("ws");
loadConfig();

declare global {
  namespace Express {
    interface User extends Omit<IUser, "otp invitedBy card"> {}
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
    if (!origin) return next(null, true);

    if (allowedOrigins.filter(curr => origin.includes(curr))?.length) {
      next(null, true);
    } else {
      next(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(morgan("dev"));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const serviceSid = process.env.TWILIO_APP_SERVICE_SID;

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

  const generateToken = (identity: string) => {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
  
    // Create a Voice grant for the token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: serviceSid,
      incomingAllow: true,
    });
  
    // Create an access token
    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity: identity,
    });
  
    token.addGrant(voiceGrant);
  
    return token.toJwt();
  };

  router.get("/token", (req, res) => {
    const identity = req.body.identity || "user";
    const token = generateToken(identity);
    res.json({ token });
  });

  // Store the dialed number for use in /voice
  let dialedNumber = "";

  // /dial endpoint called from FE to update dailedNumber
  router.post("/dial", (req, res) => {
    const { _to } = req.body;

    if (!_to) {
      return res.status(400).json({ error: "_to is required" });
    }

    dialedNumber = _to;
    res.json({ message: `Dialed number set to ${dialedNumber}` });
  });

  router.post("/voice", (req, res) => {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (!dialedNumber) {
      return res.status(400).json({ error: "Dialed number is not set" });
    }

    const statusCallbackUrl =
      `${process.env.SERVER_URL}/call-status`;

    const dial = response.dial({ callerId: process.env.TWILIO_PHONE_NUMBER });

    dial.number(
      {
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "answered", "ringing", "completed"],
      },
      dialedNumber
    );

    res.type("text/xml");
    res.send(response.toString());
  });

  router.post("/call-status", (req, res) => {
    console.log("CallStatus:", req.body.CallStatus);
    const callStatus = req.body.CallStatus;
  
    // Broadcast the status update to all connected WebSocket clients
    wss.clients.forEach((client:any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(req.body));
      }
    });
  
    // Respond with HTTP 200 to acknowledge receipt
    res.status(200).send(callStatus);
  });


  // routes
  router.use("/users", userRoutes);
  router.use("/contacts", contactRoutes)
  router.use("/calls", callRoutes);
  router.use("/notifications", notificationRoutes);
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
