import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startBlogAutomation } from "./jobs/blogScheduler.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    startBlogAutomation();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
