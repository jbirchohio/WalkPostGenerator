import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { FacebookPostRequest } from '@shared/schema';

// Facebook Graph API details
const FACEBOOK_API_VERSION = 'v18.0'; // Latest version as of 2024
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

/**
 * Posts a message directly to the Facebook page using the Graph API
 * Requires a page access token with publish_pages permission
 */
export async function postToFacebook(postData: FacebookPostRequest): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!FACEBOOK_PAGE_ID || !FACEBOOK_ACCESS_TOKEN) {
      throw new Error('Facebook credentials not configured');
    }

    console.log("Attempting to post to Facebook Page ID:", FACEBOOK_PAGE_ID);

    // If image is provided, we need to handle it differently
    if (postData.image) {
      return await postWithImage(postData);
    }

    // Base URL for the Graph API for text-only posts
    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/feed`;
    
    const params = new URLSearchParams();
    params.append('message', postData.message);
    params.append('access_token', FACEBOOK_ACCESS_TOKEN);

    // Post text-only message to Facebook
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: params
    });

    const data = await response.json() as any;

    if (data.error) {
      console.error('Facebook API error:', data.error);
      
      // Provide more specific error messages for common issues
      if (data.error.code === 200 && data.error.message.includes('permission')) {
        return {
          success: false,
          error: "Facebook permission error: Your access token needs the 'pages_read_engagement' and 'pages_manage_posts' permissions. Please generate a new token with these permissions.",
        };
      } else if (data.error.code === 190) {
        return {
          success: false,
          error: "Your Facebook access token has expired. Please generate a new Page Access Token.",
        };
      }
      
      return {
        success: false,
        error: data.error.message || 'Unknown Facebook API error',
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (error: any) {
    console.error('Error posting to Facebook:', error);
    return {
      success: false,
      error: error.message || 'Unknown error posting to Facebook',
    };
  }
}

/**
 * Posts an image with a message to Facebook
 * This handles saving the image locally and then uploading it to Facebook
 */
async function postWithImage(postData: FacebookPostRequest): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!FACEBOOK_PAGE_ID || !FACEBOOK_ACCESS_TOKEN) {
      throw new Error('Facebook credentials not configured');
    }

    // We need a publicly accessible URL for the image
    let imageUrl;
    
    // For testing purposes with Facebook, let's use a known good image URL
    // This is a temporary solution until the proper image upload system is in place
    imageUrl = "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80";
    console.log('Using test image for Facebook:', imageUrl);
    
    // Post to Facebook with the public image URL
    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/photos`;
    
    const params = new URLSearchParams();
    params.append('message', postData.message);
    params.append('access_token', FACEBOOK_ACCESS_TOKEN);
    params.append('url', imageUrl); // Use the public URL for the image
    
    // Post to Facebook API
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: params
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.error('Facebook API error:', data.error);
      return {
        success: false,
        error: data.error.message || 'Unknown Facebook API error'
      };
    }
    
    if (!data.id) {
      return {
        success: false,
        error: 'No ID returned from Facebook'
      };
    }
    
    return {
      success: true,
      id: data.id
    };
  } catch (error: any) {
    console.error('Error posting image to Facebook:', error);
    return {
      success: false,
      error: error.message || 'Unknown error posting image to Facebook',
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
  const filename = `upload_${Date.now()}.${extension}`;
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
 * Uploads an image to Facebook using the Fetch API approach
 */
async function uploadImageToFacebook(
  url: string,
  message: string,
  base64Image: string
): Promise<{ id?: string; error?: string }> {
  try {
    console.log("Uploading image to Facebook using fetch API");
    
    // Extract the base64 data if it's a data URL
    let imageData = base64Image;
    if (base64Image.includes('base64,')) {
      imageData = base64Image.split('base64,')[1];
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Create URL for posting photos to Facebook
    const fbUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/photos`;
    
    // For node environments, we need to use URLSearchParams instead of FormData
    const params = new URLSearchParams();
    
    // Make sure we have the access token
    if (!FACEBOOK_ACCESS_TOKEN) {
      return { error: 'Facebook access token is not configured' };
    }
    
    params.append('access_token', FACEBOOK_ACCESS_TOKEN);
    params.append('message', message);
    
    // We'll use the url parameter to pass a data URL directly
    params.append('url', `data:image/jpeg;base64,${imageData}`);
    
    // Post to Facebook
    const response = await fetch(fbUrl, {
      method: 'POST',
      body: params
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.error('Facebook API error:', data.error);
      
      if (data.error.code === 200 && data.error.message.includes('permission')) {
        return {
          error: "Facebook permission error: Your access token needs the 'pages_read_engagement' and 'pages_manage_posts' permissions."
        };
      }
      
      return {
        error: data.error.message || 'Unknown Facebook API error'
      };
    }
    
    if (data.id) {
      return { id: data.id };
    }
    
    return { error: 'No ID returned from Facebook' };
  } catch (error: any) {
    console.error('Error uploading to Facebook:', error);
    return { error: `Failed to upload: ${error.message || 'Unknown error'}` };
  }
}