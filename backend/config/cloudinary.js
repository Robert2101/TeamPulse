import { v2 as cloudinary } from 'cloudinary';

// Env is loaded by server.js (dotenv/config) before this module is evaluated.
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
