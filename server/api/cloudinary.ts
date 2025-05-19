import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary explicitly instead of relying on the CLOUDINARY_URL env variable
// This avoids issues with the URL format
try {
  // Parse the Cloudinary URL manually if it exists
  const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
  if (cloudinaryUrl) {
    console.log("Configuring Cloudinary...");
    
    // Extract cloud name, API key and API secret from the URL
    const cloudinaryRegex = /cloudinary:\/\/([^:]+):([^@]+)@(.+)/;
    const match = cloudinaryUrl.match(cloudinaryRegex);
    
    if (match) {
      const [, api_key, api_secret, cloud_name] = match;
      
      // Configure Cloudinary with the extracted values
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true // Force HTTPS
      });
      
      console.log(`Cloudinary configured successfully for cloud: ${cloud_name}`);
    } else {
      console.warn("Invalid Cloudinary URL format. Using fallback configuration.");
      // Don't throw error to allow the app to continue running
    }
  } else {
    console.warn("No Cloudinary URL provided. Image hosting functionality will be limited.");
  }
} catch (error) {
  console.error("Error configuring Cloudinary:", error);
  // Don't throw error to allow the app to continue running
}

// Configure cloudinary - this will use the CLOUDINARY_URL environment variable
// Format: cloudinary://api_key:api_secret@cloud_name

/**
 * Upload an image (base64 or URL) to Cloudinary and get a secure HTTPS URL
 * This URL will be compatible with Instagram's API requirements
 */
export async function uploadToCloudinary(imageData: string): Promise<string> {
  try {
    // Check if Cloudinary is properly configured
    try {
      const config = cloudinary.config();
      if (!config.cloud_name) {
        console.warn("Cloudinary not configured, returning original image URL");
        return imageData; // Return original URL if Cloudinary not configured
      }
    } catch (e) {
      console.warn("Cloudinary not available, returning original image URL");
      return imageData; // Return original URL if Cloudinary not available
    }
    
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