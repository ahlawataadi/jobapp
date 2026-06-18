import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startBlogAutomation } from "./jobs/blogScheduler.js";

const PORT = process.env.PORT || 5000;

let server;

const start = async () => {
  try {
    await connectDB();
    startBlogAutomation();
    server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Drain in-flight requests and close the DB connection on shutdown so deploys
// and container restarts don't drop live requests or leak connections.
const shutdown = (signal) => {
  console.log(`${signal} received — shutting down gracefully…`);
  if (!server) return process.exit(0);
  server.close(async () => {
    try { await mongoose.connection.close(); } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
