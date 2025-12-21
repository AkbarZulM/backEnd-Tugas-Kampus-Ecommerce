import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import publicRoute from "./routes/public.mjs";
import adminRoute from "./routes/admin.mjs";
import customerRoute from "./routes/customer.mjs";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

// setup redis
const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();
// end setup redis

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.set("trust proxy", 1);

app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ client: redisClient }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/admin", adminRoute);
app.use("/api/customer", customerRoute);
app.use("/api", publicRoute);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
