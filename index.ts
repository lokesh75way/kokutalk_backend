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
const allowedOrigins: string[] = ["https://api.latecahub.com/kokutalk", "http://localhost:5000", "http://localhost:5173"];

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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(morgan("dev"));

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

  // routes
  router.use("/users", userRoutes);
  router.use("/contacts", contactRoutes)
  router.use("/calls", callRoutes);
  router.use("/notifications", notificationRoutes);
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(mergedSwagger));

  // error handler
  app.use(errorHandler);
  app.listen(port, () => {
    console.log("App running on port", port);
  });
  
};

void initApp();
