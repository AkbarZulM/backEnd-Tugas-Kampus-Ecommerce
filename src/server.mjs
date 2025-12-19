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
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.set("trust proxy", 1); // penting kalau deploy di railway/render/vercel proxy

app.use(
  session({
    name: "sid", // nama cookie
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // jangan bikin session kosong
    store: new RedisStore({ client: redisClient }),
    cookie: {
      httpOnly: true, // JS tidak bisa akses
      secure: process.env.NODE_ENV === "production", // wajib https di prod
      sameSite: "lax", // aman default; pakai "none" kalau beda domain + https
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
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
