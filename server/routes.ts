import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { postGenerationSchema } from "@shared/schema";
import { generatePostWithOpenAI } from "./api/openai";

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

  const httpServer = createServer(app);

  return httpServer;
}
