// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import playRoutes from "./routes/playRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

const app = express();

// ---------------- Middleware ----------------
app.use(express.json());
app.use(cookieParser());

// ---------------- CORS ----------------
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
app.use(
  cors({
    origin: CLIENT_URL,      // allow frontend
    credentials: true,       // allow cookies to be sent cross-site
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ---------------- Serve uploaded images ----------------
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

// ---------------- MongoDB ----------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------------- Routes ----------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/plays", playRoutes);
app.use("/api/contact", contactRoutes); // all contact requests handled here

// ---------------- Test ----------------
app.get("/api/hello", (req, res) => res.json({ msg: "Hello from backend!" }));

// ---------------- Global Error Handler ----------------
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).json({ message: err.message || "Server error" });
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
