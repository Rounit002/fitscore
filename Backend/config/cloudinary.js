const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (fileStr) => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: 'fitscan_scans', // Optional: You can create a preset in Cloudinary
      folder: 'scans',
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

const extractCloudinaryPublicId = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl) return null;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');
    if (uploadIndex < 0) return null;

    const deliveryPath = segments.slice(uploadIndex + 1);
    const versionIndex = deliveryPath.findIndex((segment) => /^v\d+$/.test(segment));
    const publicIdSegments = versionIndex >= 0
      ? deliveryPath.slice(versionIndex + 1)
      : deliveryPath;
    if (publicIdSegments.length === 0) return null;

    const encodedPublicId = publicIdSegments.join('/').replace(/\.[^/.]+$/, '');
    return decodeURIComponent(encodedPublicId) || null;
  } catch {
    return null;
  }
};

const deleteImageByUrl = async (imageUrl) => {
  const publicId = extractCloudinaryPublicId(imageUrl);
  if (!publicId) return { deleted: false, skipped: true };

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  });

  if (!['ok', 'not found'].includes(result?.result)) {
    throw new Error(`Cloudinary did not delete ${publicId}`);
  }

  return { deleted: result.result === 'ok', publicId };
};

module.exports = {
  cloudinary,
  deleteImageByUrl,
  extractCloudinaryPublicId,
  uploadImage,
};
