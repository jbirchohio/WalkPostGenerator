import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { postGenerationSchema, facebookPostSchema } from "@shared/schema";
import { generatePostWithOpenAI } from "./api/openai";
import { postToFacebook } from "./api/facebook";
import { postToInstagram } from "./api/instagram";
import { registerImageRoutes } from "./routes-images";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Generate post route
  app.post("/api/generate", async (req, res) => {
    try {
      // Validate the request
      const result = postGenerationSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: result.error.format() 
        });
      }
      
      // Process the request using OpenAI
      const generatedPost = await generatePostWithOpenAI(result.data);
      
      // Return the generated post
      return res.json({ text: generatedPost });
      
    } catch (error: any) {
      console.error("Error generating post:", error);
      return res.status(500).json({ 
        message: "Error generating post", 
        error: error.message 
      });
    }
  });

  // Facebook posting route
  app.post("/api/facebook/post", async (req: Request, res: Response) => {
    try {
      // Check Facebook credentials first
      if (!process.env.FACEBOOK_ACCESS_TOKEN || !process.env.FACEBOOK_PAGE_ID) {
        return res.status(401).json({
          success: false,
          message: "Facebook credentials are not configured. Please provide FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID."
        });
      }
      
      // Validate the request
      const result = facebookPostSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid request data", 
          errors: result.error.format() 
        });
      }
      
      // Post to Facebook
      const fbResponse = await postToFacebook(result.data);
      
      // Return the result
      return res.json(fbResponse);
      
    } catch (error: any) {
      console.error("Error posting to Facebook:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error posting to Facebook", 
        error: error.message 
      });
    }
  });

  // Instagram posting route
  app.post("/api/instagram/post", async (req: Request, res: Response) => {
    try {
      // Check Instagram credentials first
      if (!process.env.FACEBOOK_ACCESS_TOKEN || !process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
        return res.status(401).json({
          success: false,
          message: "Instagram credentials are not configured. Please provide FACEBOOK_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID."
        });
      }
      
      // Validate the request
      const result = facebookPostSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid request data", 
          errors: result.error.format() 
        });
      }
      
      // Instagram requires an image
      if (!result.data.image) {
        return res.status(400).json({
          success: false,
          message: "Instagram requires an image for posting"
        });
      }
      
      // Post to Instagram
      const igResponse = await postToInstagram(result.data);
      
      // Return the result
      return res.json(igResponse);
      
    } catch (error: any) {
      console.error("Error posting to Instagram:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error posting to Instagram", 
        error: error.message 
      });
    }
  });

  // Register image upload routes
  registerImageRoutes(app);
  
  const httpServer = createServer(app);

  return httpServer;
}
