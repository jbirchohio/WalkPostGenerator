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
    const imagePath = await saveBase64ImageLocally(postData.image);
    
    // Step 1: Create a container for the media
    const containerId = await createMediaContainer(imagePath, postData.message);
    
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
  // Extract the base64 data
  const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length < 3) {
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
  const filename = `instagram_upload_${Date.now()}.${extension}`;
  const filePath = path.join(process.cwd(), 'uploads', filename);
  
  // Make sure the uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(filePath, buffer);
  
  return filePath;
}

/**
 * Creates a media container for Instagram
 * This is the first step in the Instagram posting process
 */
async function createMediaContainer(imagePath: string, caption: string): Promise<string | null> {
  try {
    // Instagram has a two-step posting process
    // First, create a container for the media
    const mediaUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/media`;
    
    // We need a publicly accessible URL for Instagram
    let imageUrl;
    
    // If this is a local file path, upload it to get a public URL
    if (imagePath.startsWith('data:')) {
      // Upload the image to our server to get a public URL
      const uploadResponse = await fetch(`http://localhost:5000/api/images/upload-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imagePath })
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success || !uploadResult.url) {
        console.error('Failed to upload image for Instagram:', uploadResult.message || 'Unknown error');
        return null;
      }
      
      imageUrl = uploadResult.url;
      console.log('Image uploaded to public URL for Instagram:', imageUrl);
    } else if (fs.existsSync(imagePath)) {
      // It's a local file path, read and upload it
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      
      // Upload the image to our server to get a public URL
      const uploadResponse = await fetch(`http://localhost:5000/api/images/upload-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64Image })
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success || !uploadResult.url) {
        console.error('Failed to upload image for Instagram:', uploadResult.message || 'Unknown error');
        return null;
      }
      
      imageUrl = uploadResult.url;
      console.log('Image uploaded to public URL for Instagram:', imageUrl);
    } else {
      // It's already a URL, use it directly
      imageUrl = imagePath;
    }
    
    // For Instagram, we need to create parameters with the image URL
    const params = new URLSearchParams();
    params.append('caption', caption);
    params.append('access_token', FACEBOOK_ACCESS_TOKEN!);
    
    // Important: Instagram requires a publicly accessible URL for the image
    params.append('image_url', imageUrl);
    
    console.log("Attempting to create Instagram media container with URL:", imageUrl);
    
    const response = await fetch(mediaUrl, {
      method: 'POST',
      body: params
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.error("Instagram API error:", data.error);
      return null;
    }
    
    if (data.id) {
      console.log("Instagram media container created with ID:", data.id);
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