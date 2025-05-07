const crypto = require("crypto");
const https = require("https");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");

exports.appleGameCenterLogin = async (req, res) => {
  try {
    const {
      playerId,
      displayName,
      publicKeyUrl,
      timestamp,
      salt,
      signature
    } = req.body;

    // Input validation
    if (!playerId || !publicKeyUrl || !timestamp || !salt || !signature) {
      return errorResponse(res, "Missing required Game Center fields", 400);
    }

    // 1. Download and extract the public key from the Apple certificate
    const publicKeyPem = await downloadApplePublicKey(publicKeyUrl);

    // 2. Build the payload buffer as per Apple spec
    const payload = buildPayloadBuffer(playerId, timestamp, salt);

    // 3. Verify the signature using the correct buffer
    const isValid = crypto.verify(
      "sha256",
      payload,
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      Buffer.from(signature, "base64")
    );

    // 4. Upsert user by playerId
    let user = await User.findOne({ playerId });
    if (!user) {
      user = await User.create({
        playerId,
        displayName: displayName || "Anonymous",
        avatarURL: null,
        hearts: 3,
        streak: 0,
        achievements: [],
        subscription: { plan: "free" }
      });
    }

    // 5. Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return successResponse(res, "Game Center login successful", { token, user });
  } catch (err) {
    return errorResponse(res, "Login failed", 500, { message: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return successResponse(res, "Token refreshed", { token: newToken, user });
  } catch (err) {
    return errorResponse(res, "Token refresh failed", 500, { message: err.message });
  }
};

// ✅ Proper buffer formatting per Apple spec
function buildPayloadBuffer(playerId, timestamp, salt) {
  const playerIdBuffer = Buffer.from(playerId, 'utf8');

  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigUInt64BE(BigInt(timestamp));

  const saltBuffer = Buffer.from(salt, 'base64');

  return Buffer.concat([playerIdBuffer, timestampBuffer, saltBuffer]);
}

// ✅ Extract public key from Apple's X.509 cert
function downloadApplePublicKey(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const derBuffer = Buffer.concat(chunks);
        try {
          const cert = new crypto.X509Certificate(derBuffer);

          // ✅ Properly export the PEM-formatted public key
          const publicKeyPem = cert.publicKey.export({
            type: 'spki',
            format: 'pem'
          });

          resolve(publicKeyPem);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

