// Files in demo workspaces are static assets served by the frontend (frontend/public/demo), never
// Cloudinary uploads, so deleting them must not call Cloudinary.
export const DEMO_FILE_PREFIX = 'teampulse-demo/';
export const isDemoAsset = (file) => Boolean(file?.cloudinaryId?.startsWith(DEMO_FILE_PREFIX));
