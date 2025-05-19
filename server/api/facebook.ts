import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { FacebookPostRequest } from '@shared/schema';

// Facebook Graph API details
const FACEBOOK_API_VERSION = 'v18.0'; // Latest version as of 2024
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

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

    // Extract base64 data and save image locally
    const imagePath = await saveBase64ImageLocally(postData.image!);
    
    // Upload the image to Facebook using the Graph API
    const apiUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PAGE_ID}/photos`;
    
    const formData = new URLSearchParams();
    formData.append('message', postData.message);
    formData.append('access_token', FACEBOOK_ACCESS_TOKEN);
    formData.append('published', 'true');
    
    // Create a FormData object and append the image file
    const imageStream = fs.createReadStream(imagePath);
    
    // Use our custom upload function since FormData is not directly supported
    const result = await uploadImageToFacebook(apiUrl, formData.toString(), imagePath);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.warn('Failed to delete temporary image file:', err);
    }
    
    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }
    
    return {
      success: true,
      id: result.id
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
 * Uploads an image to Facebook using the cURL approach with node
 */
async function uploadImageToFacebook(
  url: string,
  formDataString: string,
  imagePath: string
): Promise<{ id?: string; error?: string }> {
  const curl = `curl -X POST "${url}" \
    -F "access_token=${FACEBOOK_ACCESS_TOKEN}" \
    -F "message=${encodeURIComponent(formDataString)}" \
    -F "source=@${imagePath}"`;
    
  console.log("Executing curl command to upload image to Facebook");
  
  // Since we can't directly use FormData with node-fetch for files, use the HTTP API
  // to create a multipart form upload
  return new Promise((resolve) => {
    const command = `curl -X POST "${url}" -F "source=@${imagePath}" -F "${formDataString}"`;
    
    // Using node's child_process to execute the curl command
    const { exec } = require('child_process');
    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error executing curl: ${error.message}`);
        return resolve({ error: `Failed to upload: ${error.message}` });
      }
      
      if (stderr) {
        console.error(`Curl stderr: ${stderr}`);
        return resolve({ error: `Failed to upload: ${stderr}` });
      }
      
      try {
        const response = JSON.parse(stdout);
        if (response.id) {
          return resolve({ id: response.id });
        } else if (response.error) {
          return resolve({ error: response.error.message || 'Unknown error' });
        }
        
        return resolve({ error: 'No ID returned from Facebook' });
      } catch (parseError) {
        console.error('Failed to parse Facebook response:', parseError);
        return resolve({ error: `Failed to parse response: ${parseError.message}` });
      }
    });
  });
}