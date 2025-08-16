import OpenAI from "openai";
import { PostGenerationRequest } from "@shared/schema";
import sharp from "sharp";

// Use the provided API credentials
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// The OpenAI Assistant ID (if needed for future use)
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

/**
 * Generate a social media post for A Walk in the Park Cafe
 */
export async function generatePostWithOpenAI(data: PostGenerationRequest): Promise<string> {
  try {
    // Build the prompt text
    const textPrompt = buildPrompt(data);
    
    // Basic system and user messages
    const systemContent = "You are a social media manager for 'A Walk in the Park Cafe', a cozy cafe located at 1491 Aster Ave, Akron, OH 44301, next to a beautiful park. Your task is to create engaging, authentic content for Instagram and Facebook that highlights the cafe's products, ambiance, and connection to nature. Use emojis appropriately, include relevant hashtags, and make the content feel warm and inviting. Never include operating hours in your posts as they vary. Keep the location reference simple - just mention 'A Walk in the Park Cafe' or occasionally the full address (1491 Aster Ave, Akron, OH 44301) but don't invent other location details.";
    
    // Handle text-only requests
    if (!data.image) {
      console.log("Generating text-only post with OpenAI");
      const textResponse = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: textPrompt }
        ],
        max_tokens: 500
      });
      
      return textResponse.choices[0].message.content || "Sorry, I couldn't generate a post at this time.";
    } 
    
    // From here on, we're handling image requests
    console.log("Processing image data for OpenAI Vision");
    
    // Handle different image data URL formats
    let base64Image = '';
    let contentType = 'image/jpeg';
    
    try {
      if (data.image.includes('data:image/')) {
        // Extract content type and base64 data from data URL
        const matches = data.image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length >= 3) {
          contentType = matches[1];
          base64Image = matches[2];
        } else {
          // Fallback if regex match fails
          base64Image = data.image.split(',')[1] || '';
        }
      } else {
        // Handle case where data URL prefix might be missing
        base64Image = data.image;
      }
      
      // Ensure we have image data
      if (!base64Image) {
        throw new Error('Invalid image data provided');
      }
      
      // Compress the image using sharp if it's too large
      if (base64Image.length > 1 * 1024 * 1024) { // If larger than ~1MB
        console.log("Image is large, applying compression before sending to OpenAI");
        try {
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(base64Image, 'base64');
          
          // Compress and resize the image using sharp
          const compressedImageBuffer = await sharp(imageBuffer)
            .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75, progressive: true })
            .toBuffer();
          
          // Convert back to base64
          base64Image = compressedImageBuffer.toString('base64');
          contentType = 'image/jpeg'; // Force JPEG format after compression
          
          console.log(`Image compressed: Original size → Compressed size: ${(imageBuffer.length/1024/1024).toFixed(2)}MB → ${(compressedImageBuffer.length/1024/1024).toFixed(2)}MB`);
        } catch (compressionError) {
          console.error("Error compressing image:", compressionError);
          // Continue with original image if compression fails
        }
      }
      
      // Check if image data is too large (OpenAI has limits)
      if (base64Image.length > 20 * 1024 * 1024) { // 20MB limit in bytes
        console.log("Image too large, using text-only generation instead");
        const fallbackResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: `${textPrompt} (Note: An image was provided but was too large to process)` }
          ],
          max_tokens: 500
        });
        return fallbackResponse.choices[0].message.content || "Sorry, I couldn't generate a post at this time.";
      }
      
      const imagePrompt = `${textPrompt}\n\nI've attached an image to use with this post. Include relevant aspects from this image in your social media post.`;
      
      console.log(`Sending image to OpenAI (content type: ${contentType}, data length: ${base64Image.length})`);
      
      // Create multimodal request
      const imageResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemContent },
          { 
            role: "user", 
            content: [
              { type: "text", text: imagePrompt },
              { 
                type: "image_url", 
                image_url: { url: `data:${contentType};base64,${base64Image}` } 
              }
            ]
          }
        ],
        max_tokens: 500
      });
      
      return imageResponse.choices[0].message.content || "Sorry, I couldn't generate a post at this time.";
    } catch (error: any) {
      console.error("Error with image processing in OpenAI:", error);
      // Fall back to text-only if image processing fails
      console.log("Falling back to text-only generation due to error:", error.message);
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: `${textPrompt} (Note: An image was provided but could not be processed)` }
        ],
        max_tokens: 500
      });
      return fallbackResponse.choices[0].message.content || "Sorry, I couldn't generate a post at this time.";
    }
  } catch (error: any) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to generate post: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Build the prompt for OpenAI based on the request data
 */
function buildPrompt(data: PostGenerationRequest): string {
  let prompt = "Create a social media post for 'A Walk in the Park Cafe' (located at 1491 Aster Ave, Akron, OH 44301)";
  
  // Add product info if provided
  if (data.productName) {
    prompt += ` featuring our ${data.productName}`;
  }
  
  // Add post type instructions
  switch (data.postType) {
    case "promotion":
      prompt += ". This should be a promotional post highlighting a special offer or discount.";
      break;
    case "event":
      prompt += ". This should be an event announcement post.";
      break;
    case "seasonal":
      prompt += ". This should be a seasonal post highlighting this product for the current season.";
      break;
    default:
      prompt += ". This should be a general post showcasing our cafe.";
  }
  
  // Add image instructions
  if (data.image) {
    prompt += " I've attached an image to use with this post. Please describe relevant aspects of the image in your post.";
  }
  
  // Final instructions
  prompt += " Include relevant emojis and hashtags. Format it like a professional social media post that's ready to be published on Facebook or Instagram. IMPORTANT: Do NOT include any operating hours in the post, and only mention our location as 'A Walk in the Park Cafe' or the full address (1491 Aster Ave, Akron, OH 44301) if needed.";
  
  return prompt;
}
