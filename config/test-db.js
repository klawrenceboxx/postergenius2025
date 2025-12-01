// test-db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
mongoose
  .connect(process.env.MONGODB_URI)

  .then(() => {
    console.log("✅ Connected to DB:", mongoose.connection.name);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  });

// follow these steps to run this file and test your database connection
//   PS C:\Users\Kalee\OneDrive\Desktop\QuickCart> cd C:\Users\Kalee\OneDrive\Desktop\QuickCart\config
//   PS C:\Users\Kalee\OneDrive\Desktop\QuickCart\config> node test-db.js
