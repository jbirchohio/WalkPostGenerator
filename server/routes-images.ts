import { Express, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * This file contains routes for handling image uploads and processing for social media
 */

export function registerImageRoutes(app: Express) {
  // Route to handle image uploads and get a public URL
  app.post('/api/images/upload', async (req: Request, res: Response) => {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded'
        });
      }
      
      const imageFile = req.files.image as any;
      
      // Generate a unique filename
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const fileExtension = path.extname(imageFile.name) || '.jpg';
      const fileName = `${uniqueId}${fileExtension}`;
      const outputPath = path.join(process.cwd(), 'public', 'uploads', fileName);
      
      // Resize and compress the image with sharp
      try {
        await sharp(imageFile.data)
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
        
        // Fallback: directly save the uploaded file if sharp fails
        fs.writeFileSync(outputPath, imageFile.data);
      }
      
      // Generate the public URL
      // In a production environment, this would be a CDN URL or your domain
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const publicUrl = `${baseUrl}/uploads/${fileName}`;
      
      res.json({
        success: true,
        url: publicUrl
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing image upload',
        error: error.message
      });
    }
  });
  
  // Route to handle base64 image uploads
  app.post('/api/images/upload-base64', async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      
      if (!image || typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'No base64 image provided'
        });
      }
      
      // Extract the base64 data
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (!matches || matches.length < 3) {
        return res.status(400).json({
          success: false, 
          message: 'Invalid base64 image format'
        });
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
      const outputPath = path.join(process.cwd(), 'public', 'uploads', fileName);
      
      // Resize and compress the image with sharp
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
        
        // Fallback: directly save the uploaded file if sharp fails
        fs.writeFileSync(outputPath, buffer);
      }
      
      // Generate the public URL
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const publicUrl = `${baseUrl}/uploads/${fileName}`;
      
      res.json({
        success: true,
        url: publicUrl
      });
    } catch (error: any) {
      console.error('Error processing base64 image:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing image upload',
        error: error.message
      });
    }
  });
}