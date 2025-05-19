import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with direct API keys
// This avoids issues with the URL format
cloudinary.config({
  cloud_name: 'ddd4kwqtr',
  api_key: '869334455434463',
  api_secret: '-gmWHYX66lspJrQYF9XDPKvYd2A',
  secure: true // Force HTTPS
});

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
    // Return the original URL in case of error rather than failing completely
    console.log("Returning original URL due to Cloudinary error");
    return imageData;
  }
}