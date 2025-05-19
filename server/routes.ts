import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { postGenerationSchema, facebookPostSchema } from "@shared/schema";
import { generatePostWithOpenAI } from "./api/openai";
import { postToFacebook } from "./api/facebook";
import { postToInstagram } from "./api/instagram";
import { registerImageRoutes } from "./routes-images";
import { saveBase64ImageAndGetUrl } from "./api/upload";
import { 
  savePost, 
  updatePost, 
  getPosts, 
  getPost, 
  deletePost, 
  savePostAnalytics, 
  getPostAnalytics, 
  getAnalyticsSummary 
} from "./api/posts";
import {
  fetchCombinedPostAnalytics,
  fetchAccountAnalytics
} from "./api/analytics";

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
      
      // Handle image if present
      let postData = result.data;
      
      if (result.data.image && result.data.image.startsWith('data:')) {
        try {
          // Convert image to a public URL
          const imageUrl = await saveBase64ImageAndGetUrl(result.data.image, req);
          console.log("Image saved for Facebook and accessible at:", imageUrl);
          
          // Update post data with the image URL
          postData = {
            ...result.data,
            image: imageUrl
          };
        } catch (err) {
          console.error("Error processing image for Facebook:", err);
          return res.status(500).json({
            success: false,
            message: "Error processing image for Facebook post",
            error: err.message
          });
        }
      }
      
      // Post to Facebook
      const fbResponse = await postToFacebook(postData);
      
      // If post was successful, save to history
      if (fbResponse.success && fbResponse.id) {
        try {
          await savePost({
            content: postData.message,
            image: postData.image || null,
            postType: req.body.postType || "general",
            productName: req.body.productName || null,
            publishStatus: "published",
            publishedTo: ["facebook"],
            facebookPostId: fbResponse.id
          });
          console.log("Post saved to history after Facebook posting");
        } catch (error) {
          console.warn("Failed to save post to history after Facebook posting:", error);
          // Continue anyway since the post was successful
        }
      }
      
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
      
      // First, save the image and get a publicly accessible URL
      let imageUrl;
      try {
        if (result.data.image.startsWith('data:')) {
          imageUrl = await saveBase64ImageAndGetUrl(result.data.image, req);
          console.log("Image saved for Instagram and accessible at:", imageUrl);
        } else {
          // If it's already a URL, use it directly
          imageUrl = result.data.image;
        }
      } catch (err) {
        console.error("Error processing image for Instagram:", err);
        return res.status(500).json({
          success: false,
          message: "Error processing image for Instagram post",
          error: err.message
        });
      }
      
      // Create a modified version of the post data with the image URL
      const postData = {
        ...result.data,
        image: imageUrl
      };
      
      // Post to Instagram
      const igResponse = await postToInstagram(postData);
      
      // If post was successful, save to history
      if (igResponse.success && igResponse.id) {
        try {
          await savePost({
            content: postData.message,
            image: postData.image,
            postType: req.body.postType || "general",
            productName: req.body.productName || null,
            publishStatus: "published",
            publishedTo: ["instagram"],
            instagramPostId: igResponse.id
          });
          console.log("Post saved to history after Instagram posting");
        } catch (error) {
          console.warn("Failed to save post to history after Instagram posting:", error);
          // Continue anyway since the post was successful
        }
      }
      
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
  
  // Save post to history
  app.post("/api/posts", async (req: Request, res: Response) => {
    try {
      const result = await savePost(req.body);
      return res.json(result);
    } catch (error: any) {
      console.error("Error saving post:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error saving post"
      });
    }
  });
  
  // Get post history
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const { limit, offset, postType, publishStatus, sortBy, sortOrder } = req.query;
      
      const result = await getPosts(
        Number(limit) || 20,
        Number(offset) || 0,
        postType as string | undefined,
        publishStatus as string | undefined,
        sortBy as string || 'createdAt',
        (sortOrder as 'asc' | 'desc') || 'desc'
      );
      
      return res.json(result);
    } catch (error: any) {
      console.error("Error getting posts:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error getting posts"
      });
    }
  });
  
  // Get a single post
  app.get("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID"
        });
      }
      
      const result = await getPost(id);
      return res.json(result);
    } catch (error: any) {
      console.error("Error getting post:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error getting post"
      });
    }
  });
  
  // Update a post
  app.put("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID"
        });
      }
      
      const result = await updatePost(id, req.body);
      return res.json(result);
    } catch (error: any) {
      console.error("Error updating post:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error updating post"
      });
    }
  });
  
  // Delete a post
  app.delete("/api/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID"
        });
      }
      
      const result = await deletePost(id);
      return res.json(result);
    } catch (error: any) {
      console.error("Error deleting post:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error deleting post"
      });
    }
  });
  
  // Save post analytics
  app.post("/api/posts/:id/analytics", async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.id);
      
      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID"
        });
      }
      
      const analyticsData = {
        ...req.body,
        postId
      };
      
      const result = await savePostAnalytics(analyticsData);
      return res.json(result);
    } catch (error: any) {
      console.error("Error saving post analytics:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error saving post analytics"
      });
    }
  });
  
  // Get analytics for a post
  app.get("/api/posts/:id/analytics", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID"
        });
      }
      
      const result = await getPostAnalytics(id);
      return res.json(result);
    } catch (error: any) {
      console.error("Error getting post analytics:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error getting post analytics"
      });
    }
  });
  
  // Get analytics summary
  app.get("/api/analytics/summary", async (req: Request, res: Response) => {
    try {
      const result = await getAnalyticsSummary();
      return res.json(result);
    } catch (error: any) {
      console.error("Error getting analytics summary:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error getting analytics summary"
      });
    }
  });
  
  // Refresh analytics data for a post from social media platforms
  app.post("/api/posts/:id/refresh-analytics", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid post ID"
        });
      }
      
      // Get the post first to retrieve platform IDs
      const postResult = await getPost(id);
      
      if (!postResult.success || !postResult.post) {
        return res.status(404).json({
          success: false,
          error: "Post not found"
        });
      }
      
      // Fetch analytics from platforms
      const analyticsResult = await fetchCombinedPostAnalytics(postResult.post);
      
      if (!analyticsResult.success) {
        return res.status(500).json({
          success: false,
          error: analyticsResult.error || "Error fetching analytics from platforms"
        });
      }
      
      // Update the post with the new analytics data
      const updateData = {
        impressions: analyticsResult.analytics.impressions,
        likes: analyticsResult.analytics.likes,
        comments: analyticsResult.analytics.comments,
        shares: analyticsResult.analytics.shares,
        engagement: analyticsResult.analytics.engagement,
        lastAnalyticsFetch: new Date()
      };
      
      const updateResult = await updatePost(id, updateData);
      
      return res.json({
        success: true,
        post: updateResult.post,
        analytics: analyticsResult.analytics
      });
    } catch (error: any) {
      console.error("Error refreshing post analytics:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error refreshing post analytics"
      });
    }
  });
  
  const httpServer = createServer(app);

  return httpServer;
}
