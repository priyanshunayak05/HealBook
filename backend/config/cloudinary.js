const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

const envPath = path.resolve(__dirname, "../.env");

const getCredentials = () => {
  delete process.env.CLOUDINARY_URL;

  if (fs.existsSync(envPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath));
      if (parsed.CLOUDINARY_CLOUD_NAME) process.env.CLOUDINARY_CLOUD_NAME = parsed.CLOUDINARY_CLOUD_NAME.trim();
      if (parsed.CLOUDINARY_API_KEY) process.env.CLOUDINARY_API_KEY = parsed.CLOUDINARY_API_KEY.trim();
      if (parsed.CLOUDINARY_API_SECRET) process.env.CLOUDINARY_API_SECRET = parsed.CLOUDINARY_API_SECRET.trim();
    } catch (e) {
      console.error("Error reading backend .env file:", e);
    }
  }

  let cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  let api_key = (process.env.CLOUDINARY_API_KEY || "").trim();
  let api_secret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  console.log("Cloudinary env status:", {
    cloud_name: cloud_name || "MISSING",
    api_key: api_key ? `${api_key.slice(0, 4)}***` : "MISSING",
    api_secret: api_secret ? "***PRESENT***" : "MISSING",
  });

  if (!cloud_name || !api_key || !api_secret || cloud_name.startsWith("your_") || api_key.startsWith("your_")) {
    return null;
  }

  return { cloud_name, api_key, api_secret };
};

const getLocalFallback = (filePath) => {
  const filename = path.basename(filePath);
  const port = process.env.PORT || 4000;
  const localUrl = `http://localhost:${port}/uploads/${filename}`;
  return {
    secure_url: localUrl,
    url: localUrl,
    public_id: `local_${filename}`,
  };
};

const uploadToCloudinary = async (filePath, folder) => {
  try {
    const creds = getCredentials();
    if (!creds) {
      console.warn("Cloudinary credentials missing or incomplete. Serving file locally.");
      return getLocalFallback(filePath);
    }

    cloudinary.config({
      ...creds,
      secure: true,
    });

    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      cloud_name: creds.cloud_name,
      api_key: creds.api_key,
      api_secret: creds.api_secret,
      secure: true,
    });

    // clean up local temp file uploaded by multer once uploaded to Cloudinary
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return result;
  } catch (error) {
    console.error("Cloudinary upload failed (HTTP 403 / Auth error):", error?.message || error);
    console.warn("Falling back to local static image upload serving.");
    return getLocalFallback(filePath);
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId || publicId.startsWith("local_")) {
      return { result: "ok" };
    }

    const creds = getCredentials();
    if (!creds) {
      return { result: "ok" };
    }

    return await cloudinary.uploader.destroy(publicId, {
      cloud_name: creds.cloud_name,
      api_key: creds.api_key,
      api_secret: creds.api_secret,
      secure: true,
    });
  } catch (error) {
    console.warn("Cloudinary deletion warning:", error?.message || error);
    return { result: "ok" };
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
