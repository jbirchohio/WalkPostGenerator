import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { postGenerationSchema, facebookPostSchema } from "@shared/schema";
import { generatePostWithOpenAI } from "./api/openai";
import { postToFacebook } from "./api/facebook";

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

  const httpServer = createServer(app);

  return httpServer;
}
