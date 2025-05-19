import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Handles image uploads and provides a public URL for social media sharing
 */

/**
 * Save a base64 image to the public uploads directory and return a URL
 */
export async function saveBase64ImageAndGetUrl(base64Image: string, req: any): Promise<string> {
  try {
    // Extract the base64 data
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length < 3) {
      throw new Error('Invalid base64 image format');
    }
    
    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine file extension
    let extension = '.jpg';  // Default
    if (imageType.includes('png')) {
      extension = '.png';
    } else if (imageType.includes('gif')) {
      extension = '.gif';
    }
    
    // Generate a unique filename
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `${uniqueId}${extension}`;
    const outputDir = path.join(process.cwd(), 'public', 'uploads');
    const outputPath = path.join(outputDir, fileName);
    
    // Ensure uploads directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Process the image with sharp (compress and optimize)
    try {
      await sharp(buffer)
        .resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } catch (err) {
      console.error('Error processing image with sharp:', err);
      // Fallback: save the original if sharp fails
      fs.writeFileSync(outputPath, buffer);
    }
    
    // Generate the public URL
    // For Facebook/Instagram, this needs to be a publicly accessible URL
    // In development, we'll construct a URL that should work on Replit
    const host = req.headers.host || 'localhost:5000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const publicUrl = `${protocol}://${host}/uploads/${fileName}`;
    
    console.log('Image saved and accessible at:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}