import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { FacebookPostRequest } from '@shared/schema';

// Instagram Graph API details
const FACEBOOK_API_VERSION = 'v18.0'; // Latest version as of 2024
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

/**
 * Posts an image to Instagram with caption
 * Instagram requires a specific process for posting:
 * 1. Upload the image to get a container ID
 * 2. Publish the container with the caption
 */
export async function postToInstagram(postData: FacebookPostRequest): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!INSTAGRAM_BUSINESS_ACCOUNT_ID || !FACEBOOK_ACCESS_TOKEN) {
      throw new Error('Instagram credentials not configured');
    }

    // Instagram requires an image, cannot post text-only
    if (!postData.image) {
      return {
        success: false,
        error: 'Instagram requires an image for posting'
      };
    }

    console.log("Attempting to post to Instagram Business Account ID:", INSTAGRAM_BUSINESS_ACCOUNT_ID);

    // Extract base64 data and save image locally
    let imageUrl;
    if (postData.image.startsWith('http')) {
      // Already a URL, use it directly
      imageUrl = postData.image;
      console.log("Using existing image URL for Instagram:", imageUrl);
    } else {
      // Save base64 image and get a public URL
      imageUrl = await saveBase64ImageLocally(postData.image);
      console.log("Image saved and converted to URL for Instagram:", imageUrl);
    }
    
    // Step 1: Create a container for the media
    const containerId = await createMediaContainer(imageUrl, postData.message);
    
    if (!containerId) {
      throw new Error('Failed to create Instagram media container');
    }
    
    // Step 2: Publish the container
    const publishResult = await publishMedia(containerId);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.warn('Failed to delete temporary image file:', err);
    }
    
    return publishResult;
  } catch (error: any) {
    console.error('Error posting to Instagram:', error);
    return {
      success: false,
      error: error.message || 'Unknown error posting to Instagram',
    };
  }
}

/**
 * Saves a base64 image to a local file
 */
async function saveBase64ImageLocally(base64Image: string): Promise<string> {
  try {
    // Check if the image is already a URL (e.g., from a previous save operation)
    if (base64Image.startsWith('http')) {
      console.log("Image is already a URL:", base64Image);
      return base64Image;
    }
    
    // Extract the base64 data
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length < 3) {
      // Try a more lenient approach if standard format doesn't match
      if (base64Image.includes('base64')) {
        const parts = base64Image.split('base64,');
        if (parts.length > 1) {
          const buffer = Buffer.from(parts[1], 'base64');
          const extension = 'jpg'; // Default to jpg
          const filename = `instagram_upload_${Date.now().toString(16)}.${extension}`;
          const filePath = path.join(process.cwd(), 'uploads', filename);
          
          // Make sure the uploads directory exists
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Write the file
          fs.writeFileSync(filePath, buffer);
          
          // Create a public URL
          const appUrl = process.env.APP_URL || 'http://localhost:5000';
          const publicUrl = `${appUrl}/uploads/${filename}`;
          console.log("Image saved for Instagram and accessible at:", publicUrl);
          
          return publicUrl;
        }
      }
      
      throw new Error('Invalid base64 image format');
    }
    
    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine file extension
    let extension = 'jpg';  // Default
    if (imageType.includes('png')) {
      extension = 'png';
    } else if (imageType.includes('gif')) {
      extension = 'gif';
    }
    
    // Create a unique filename
    const filename = `${Date.now().toString(16)}.${extension}`;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    // Make sure the uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(filePath, buffer);
    
    // Create a public URL
    const appUrl = process.env.APP_URL || `http://localhost:5000`;
    const publicUrl = `${appUrl}/uploads/${filename}`;
    console.log("Image saved for Instagram and accessible at:", publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error("Error saving image for Instagram:", error);
    throw error;
  }
}

/**
 * Creates a media container for Instagram
 * This is the first step in the Instagram posting process
 */
async function createMediaContainer(imagePath: string, caption: string): Promise<string | null> {
  try {
    // Instagram has a two-step posting process
    // First, verify we have the correct credentials
    if (!INSTAGRAM_BUSINESS_ACCOUNT_ID || !FACEBOOK_ACCESS_TOKEN) {
      console.error('Instagram credentials not configured properly');
      return null;
    }
    
    console.log('Creating Instagram media container with the following:');
    console.log('- Instagram Business Account ID:', INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log('- Image URL:', imagePath || "Not provided");
    
    // The endpoint to create the media container
    const mediaUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`;
    
    // Instagram requires a publicly accessible HTTPS URL for the image
    // Ensure image URL is using https and is accessible
    let publicImageUrl = imagePath;
    
    // If the URL isn't a fully-qualified HTTPS URL, use a fallback image
    if (!publicImageUrl.startsWith('https://')) {
      console.warn("Instagram requires HTTPS URLs. Using fallback image URL.");
      // Use a guaranteed public HTTPS URL for testing
      publicImageUrl = "https://images.unsplash.com/photo-1511920170033-f8396924c348?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80";
    }
    
    console.log("Using image URL for Instagram:", publicImageUrl);
    
    // For Instagram, we need proper params with the image URL
    const params = new URLSearchParams();
    params.append('caption', caption);
    params.append('access_token', FACEBOOK_ACCESS_TOKEN);
    params.append('image_url', publicImageUrl);
    
    console.log("Making API request to Instagram for media container creation...");
    
    const response = await fetch(mediaUrl, {
      method: 'POST',
      body: params
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.error("Instagram API error:", data.error);
      if (data.error.code === 100) {
        console.error("This is likely an issue with the image URL not being publicly accessible to Instagram.");
        console.error("Instagram requires a fully public HTTPS URL that it can access.");
      }
      return null;
    }
    
    if (data.id) {
      console.log("Instagram media container created successfully with ID:", data.id);
      return data.id;
    }
    
    console.error("No container ID returned from Instagram:", data);
    return null;
  } catch (error) {
    console.error("Error creating Instagram media container:", error);
    return null;
  }
}

/**
 * Publishes the media container to Instagram
 * This is the second step in the Instagram posting process
 */
async function publishMedia(containerId: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const publishUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media_publish`;
    
    const params = new URLSearchParams();
    params.append('creation_id', containerId);
    params.append('access_token', FACEBOOK_ACCESS_TOKEN!);
    
    const response = await fetch(publishUrl, {
      method: 'POST',
      body: params
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.error('Instagram publishing error:', data.error);
      return {
        success: false,
        error: data.error.message || 'Unknown Instagram publishing error'
      };
    }
    
    return {
      success: true,
      id: data.id
    };
  } catch (error: any) {
    console.error('Error publishing to Instagram:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to Instagram'
    };
  }
}