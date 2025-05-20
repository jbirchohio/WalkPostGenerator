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
        } catch (err: any) {
          console.error("Error processing image for Facebook:", err);
          return res.status(500).json({
            success: false,
            message: "Error processing image for Facebook post",
            error: err.message || "Unknown error"
          });
        }
      }
      
      // Post to Facebook
      const fbResponse = await postToFacebook(postData);
      
      // If post was successful, save to history
      if (fbResponse.success && fbResponse.id) {
        try {
          console.log("Saving Facebook post with ID:", fbResponse.id);
          const saveResult = await savePost({
            content: postData.message,
            image: postData.image || null,
            postType: req.body.postType || "general",
            productName: req.body.productName || null,
            publishStatus: "published",
            publishedTo: ["facebook"],
            facebookPostId: fbResponse.id
          });
          console.log("Post saved to history after Facebook posting with ID:", saveResult.id);
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
      } catch (err: any) {
        console.error("Error processing image for Instagram:", err);
        return res.status(500).json({
          success: false,
          message: "Error processing image for Instagram post",
          error: err.message || "Unknown error"
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
          console.log("Saving Instagram post with ID:", igResponse.id);
          const saveResult = await savePost({
            content: postData.message,
            image: postData.image,
            postType: req.body.postType || "general",
            productName: req.body.productName || null,
            publishStatus: "published",
            publishedTo: ["instagram"],
            instagramPostId: igResponse.id
          });
          console.log("Post saved to history after Instagram posting with ID:", saveResult.id);
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

  // New endpoint for posting to both Facebook and Instagram simultaneously
  app.post("/api/post-to-all", async (req: Request, res: Response) => {
    try {
      // Check credentials for both platforms
      if (!process.env.FACEBOOK_ACCESS_TOKEN) {
        return res.status(401).json({
          success: false,
          message: "Facebook credentials are not configured. Please provide FACEBOOK_ACCESS_TOKEN."
        });
      }
      
      if (!process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
        return res.status(401).json({
          success: false,
          message: "Instagram credentials are not configured. Please provide INSTAGRAM_BUSINESS_ACCOUNT_ID."
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
      
      // Instagram requires an image for posting
      if (!result.data.image) {
        return res.status(400).json({
          success: false,
          message: "An image is required when posting to Instagram"
        });
      }
      
      // Process image first - we need a URL that works for both platforms
      let imageUrl;
      try {
        if (result.data.image.startsWith('data:')) {
          // For cross-platform posting, we'll use Cloudinary to ensure compatibility
          imageUrl = await uploadToCloudinary(result.data.image);
          console.log("Image uploaded to Cloudinary:", imageUrl);
        } else {
          // If it's already a URL, use it directly
          imageUrl = result.data.image;
        }
      } catch (err: any) {
        console.error("Error processing image for multi-platform post:", err);
        return res.status(500).json({
          success: false,
          message: "Error processing image for cross-platform post",
          error: err.message || "Unknown error"
        });
      }
      
      // Create post data with the processed image URL
      const postData = {
        ...result.data,
        image: imageUrl
      };
      
      // Post to both platforms and collect results
      const results = {
        facebook: null as any,
        instagram: null as any,
        success: false,
        postId: null as number | null,
        platforms: [] as string[]
      };
      
      // Post to Facebook
      console.log("Posting to Facebook...");
      const fbResponse = await postToFacebook(postData);
      results.facebook = fbResponse;
      
      // Post to Instagram
      console.log("Posting to Instagram...");
      const igResponse = await postToInstagram(postData);
      results.instagram = igResponse;
      
      // Save to history with both platform IDs if at least one was successful
      if ((fbResponse.success && fbResponse.id) || (igResponse.success && igResponse.id)) {
        const publishedTo = [];
        if (fbResponse.success && fbResponse.id) publishedTo.push("facebook");
        if (igResponse.success && igResponse.id) publishedTo.push("instagram");
        
        try {
          console.log("Saving cross-platform post with IDs:", {
            facebook: fbResponse.id,
            instagram: igResponse.id
          });
          
          const saveResult = await savePost({
            content: postData.message,
            image: postData.image,
            postType: req.body.postType || "general",
            productName: req.body.productName || null,
            publishStatus: "published",
            publishedTo,
            facebookPostId: fbResponse.success ? fbResponse.id : null,
            instagramPostId: igResponse.success ? igResponse.id : null
          });
          
          console.log("Post saved to history with ID:", saveResult.id);
          results.success = true;
          results.postId = saveResult.id;
          results.platforms = publishedTo;
        } catch (error: any) {
          console.warn("Failed to save post to history after multi-platform posting:", error);
        }
      } else {
        // Return error if both posts failed
        return res.status(500).json({
          success: false,
          message: "Failed to post to any platform",
          facebook: fbResponse,
          instagram: igResponse
        });
      }
      
      return res.json(results);
      
    } catch (error: any) {
      console.error("Error in multi-platform posting:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error posting to multiple platforms", 
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
      
      const queryParams = {
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
        postType: postType as string | undefined,
        publishStatus: publishStatus as string | undefined,
        sortBy: sortBy as string || 'createdAt',
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc'
      };
      
      const result = await getPosts(queryParams);
      
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
  
  // Refresh all posts analytics
  app.post("/api/analytics/refresh-all", async (req: Request, res: Response) => {
    try {
      // Get all published posts
      const postsQuery = { publishStatus: "published" };
      const postsResult = await getPosts(postsQuery);
      
      if (!postsResult.success) {
        return res.status(500).json({
          success: false,
          error: postsResult.error || "Failed to get published posts"
        });
      }
      
      const refreshedPosts = [];
      const skippedPosts = [];
      const errors = [];
      
      // Validate posts before trying to refresh
      if (!postsResult.posts || postsResult.posts.length === 0) {
        return res.json({
          success: true,
          message: "No published posts found to refresh",
          refreshed: 0
        });
      }
      
      console.log(`Found ${postsResult.posts.length} published posts to refresh analytics`);
      
      // Refresh analytics for each post
      for (const post of postsResult.posts) {
        // Skip posts that don't have platform IDs
        if ((!post.facebookPostId && !post.instagramPostId) || 
            !post.publishedTo || post.publishedTo.length === 0) {
          console.log(`Skipping post ${post.id} - No platform IDs or not published to any platform`);
          skippedPosts.push({
            postId: post.id,
            reason: "No platform IDs or not published to any social media platform"
          });
          continue;
        }
          
        try {
          console.log(`Refreshing analytics for post ${post.id}`);
          console.log(`Platform IDs: Facebook=${post.facebookPostId}, Instagram=${post.instagramPostId}`);
          
          // Fetch analytics from platforms
          const analyticsResult = await fetchCombinedPostAnalytics(post);
          
          if (analyticsResult.success && analyticsResult.analytics) {
            // Update the post with the new analytics data
            const updateData = {
              impressions: analyticsResult.analytics.impressions || 0,
              likes: analyticsResult.analytics.likes || 0,
              comments: analyticsResult.analytics.comments || 0,
              shares: analyticsResult.analytics.shares || 0,
              clicks: analyticsResult.analytics.clicks || 0,
              engagement: analyticsResult.analytics.engagement || 0,
              lastAnalyticsFetch: new Date()
            };
            
            // Save historical analytics data for each platform
            if (analyticsResult.analytics.platforms) {
              const platforms = analyticsResult.analytics.platforms;
              
              // Save Facebook analytics history if available
              if (platforms.facebook && post.publishedTo?.includes('facebook')) {
                const fbData = platforms.facebook;
                const analyticsEntry = {
                  postId: post.id,
                  platform: 'facebook',
                  impressions: fbData.impressions || 0,
                  likes: fbData.likes || 0,
                  comments: fbData.comments || 0,
                  shares: fbData.shares || 0,
                  clicks: fbData.clicks || 0,
                  engagementRate: ((fbData.engagement || 0) / (fbData.impressions || 1) * 100).toFixed(2),
                  metadata: fbData
                };
                
                console.log(`Saving Facebook analytics history for post ${post.id}:`, analyticsEntry);
                await savePostAnalytics(analyticsEntry);
              }
              
              // Save Instagram analytics history if available
              if (platforms.instagram && post.publishedTo?.includes('instagram')) {
                const igData = platforms.instagram;
                const analyticsEntry = {
                  postId: post.id,
                  platform: 'instagram',
                  impressions: igData.impressions || 0,
                  likes: igData.likes || 0,
                  comments: igData.comments || 0,
                  shares: igData.shares || 0,
                  clicks: igData.clicks || 0,
                  engagementRate: ((igData.engagement || 0) / (igData.impressions || 1) * 100).toFixed(2),
                  metadata: igData
                };
                
                console.log(`Saving Instagram analytics history for post ${post.id}:`, analyticsEntry);
                await savePostAnalytics(analyticsEntry);
              }
            }
            
            const updateResult = await updatePost(post.id, updateData);
            
            if (updateResult.success) {
              refreshedPosts.push(updateResult.post);
            } else {
              errors.push({
                postId: post.id,
                error: updateResult.error || `Failed to update post ${post.id} with new analytics`
              });
            }
          } else {
            // Log analytics errors but continue to next post
            console.warn(`Failed to fetch analytics for post ${post.id}: ${analyticsResult.error}`);
            errors.push({
              postId: post.id,
              error: analyticsResult.error || `Failed to fetch analytics for post ${post.id}`
            });
          }
        } catch (postError: any) {
          console.error(`Error refreshing analytics for post ${post.id}:`, postError);
          errors.push({
            postId: post.id,
            error: postError.message || `Failed to refresh post ${post.id}`
          });
        }
      }
      
      return res.json({
        success: true,
        refreshed: refreshedPosts.length,
        skipped: skippedPosts.length > 0 ? skippedPosts : undefined,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error refreshing all analytics:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error refreshing all analytics"
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
        impressions: analyticsResult.analytics?.impressions || 0,
        likes: analyticsResult.analytics?.likes || 0,
        comments: analyticsResult.analytics?.comments || 0,
        shares: analyticsResult.analytics?.shares || 0,
        clicks: analyticsResult.analytics?.clicks || 0,
        engagement: analyticsResult.analytics?.engagement || 0,
        lastAnalyticsFetch: new Date()
      };
      
      // Log the post to check if we have platform IDs for debugging
      console.log("Post being updated with analytics:", JSON.stringify(postResult.post, null, 2));
      console.log("Platform IDs:", {
        facebookId: postResult.post.facebookPostId,
        instagramId: postResult.post.instagramPostId
      });
      
      // Save historical analytics data for each platform
      if (analyticsResult.analytics?.platforms) {
        const platforms = analyticsResult.analytics.platforms;
        
        // Save Facebook analytics history if available
        if (platforms.facebook && postResult.post.publishedTo?.includes('facebook')) {
          const fbData = platforms.facebook;
          await savePostAnalytics({
            postId: id,
            platform: 'facebook',
            impressions: fbData.impressions || 0,
            likes: fbData.likes || 0,
            comments: fbData.comments || 0,
            shares: fbData.shares || 0,
            clicks: fbData.clicks || 0,
            engagementRate: ((fbData.engagement || 0) / (fbData.impressions || 1) * 100).toFixed(2),
            metadata: fbData
          });
        }
        
        // Save Instagram analytics history if available
        if (platforms.instagram && postResult.post.publishedTo?.includes('instagram')) {
          const igData = platforms.instagram;
          await savePostAnalytics({
            postId: id,
            platform: 'instagram',
            impressions: igData.impressions || 0,
            likes: igData.likes || 0,
            comments: igData.comments || 0,
            shares: igData.shares || 0,
            clicks: igData.clicks || 0,
            engagementRate: ((igData.engagement || 0) / (igData.impressions || 1) * 100).toFixed(2),
            metadata: igData
          });
        }
      }
      
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
