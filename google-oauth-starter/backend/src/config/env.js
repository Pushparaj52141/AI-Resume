import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["MONGO_URI", "GOOGLE_CLIENT_ID", "JWT_SECRET", "FRONTEND_URL"];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: process.env.PORT || 5001,
  mongoUri: process.env.MONGO_URI,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  frontendUrl: process.env.FRONTEND_URL
};
