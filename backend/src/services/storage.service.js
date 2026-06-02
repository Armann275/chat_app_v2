import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let cachedCloudinary = null;

export function isCloudStorageEnabled() {
  return Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
  );
}

async function getCloudinary() {
  if (cachedCloudinary) return cachedCloudinary;
  const mod = await import('cloudinary');
  const cloudinary = mod.v2;
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
  cachedCloudinary = cloudinary;
  return cloudinary;
}

/**
 * Persist an uploaded file (a multer disk-storage file object) and return its
 * public URL.
 *
 * - With Cloudinary configured: uploads to the CDN and removes the local temp
 *   file. Returns an absolute HTTPS URL.
 * - Otherwise: leaves the file on local disk (already written by multer) and
 *   returns the relative `/uploads/files/<filename>` path served by the API.
 */
export async function persistUpload(file, { folder = 'uploads' } = {}) {
  if (isCloudStorageEnabled()) {
    const cloudinary = await getCloudinary();
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'auto',
        public_id: path.parse(file.filename).name,
      });
      return { url: result.secure_url };
    } finally {
      // The local copy is only a temporary staging file in cloud mode.
      fs.promises.unlink(file.path).catch((err) => {
        logger.warn('Could not remove temp upload file', {
          path: file.path,
          message: err.message,
        });
      });
    }
  }

  return { url: `/uploads/files/${file.filename}` };
}
