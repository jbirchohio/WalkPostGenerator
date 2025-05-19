import { v2 as cloudinary } from 'cloudinary';

// Make sure we initialize cloudinary with proper configuration
// This will use the CLOUDINARY_URL environment variable
cloudinary.config({
  secure: true // Force HTTPS
});

// Configure cloudinary - this will use the CLOUDINARY_URL environment variable
// Format: cloudinary://api_key:api_secret@cloud_name

/**
 * Upload an image (base64 or URL) to Cloudinary and get a secure HTTPS URL
 * This URL will be compatible with Instagram's API requirements
 */
export async function uploadToCloudinary(imageData: string): Promise<string> {
  try {
    // Check if we already have a Cloudinary URL
    if (imageData.includes('cloudinary.com')) {
      console.log("Image is already on Cloudinary:", imageData);
      return imageData;
    }

    // Determine if we're dealing with a base64 image or a URL
    const isBase64 = imageData.startsWith('data:');
    
    let uploadResult;
    
    if (isBase64) {
      // Upload base64 image directly
      console.log("Uploading base64 image to Cloudinary...");
      uploadResult = await cloudinary.uploader.upload(imageData, {
        resource_type: 'image',
        folder: 'cafe_social',
      });
    } else {
      // Upload from existing URL
      console.log("Uploading from existing URL to Cloudinary:", imageData);
      uploadResult = await cloudinary.uploader.upload(imageData, {
        resource_type: 'image',
        folder: 'cafe_social',
      });
    }
    
    console.log("Image uploaded to Cloudinary successfully");
    
    // Return the secure URL that's compatible with Instagram
    return uploadResult.secure_url;
  } catch (error: any) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message || 'Unknown error'}`);
  }
}