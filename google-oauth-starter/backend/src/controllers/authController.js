import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const googleClient = new OAuth2Client(env.googleClientId);

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400);
      throw new Error("Google credential is required");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      res.status(401);
      throw new Error("Invalid Google token payload");
    }

    let user = await User.findOne({
      $or: [{ email: payload.email }, { googleId: payload.sub }]
    });

    if (!user) {
      user = await User.create({
        name: payload.name || "Google User",
        email: payload.email,
        googleId: payload.sub,
        picture: payload.picture || "",
        provider: "google"
      });
    } else {
      user.name = payload.name || user.name;
      user.picture = payload.picture || user.picture;
      user.googleId = payload.sub;
      await user.save();
    }

    const token = generateToken(user._id.toString());

    return res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        googleId: user.googleId,
        picture: user.picture,
        provider: user.provider
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({
    message: "Logout successful. Remove token on client side."
  });
};
