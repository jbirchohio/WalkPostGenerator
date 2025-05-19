import OpenAI from "openai";
import { PostGenerationRequest } from "@shared/schema";

// Use the provided API credentials
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// The OpenAI Assistant ID (if needed for future use)
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || "asst_Tjl2yMLdhaOav1RMT6gAC8so";

/**
 * Generate a social media post for A Walk in the Park Cafe
 */
export async function generatePostWithOpenAI(data: PostGenerationRequest): Promise<string> {
  try {
    // Build the prompt text
    const textPrompt = buildPrompt(data);
    
    // Basic system and user messages
    const systemContent = "You are a social media manager for 'A Walk in the Park Cafe', a cozy cafe located at 1491 Aster Ave, Akron, OH 44301, next to a beautiful park. Your task is to create engaging, authentic content for Instagram and Facebook that highlights the cafe's products, ambiance, and connection to nature. Use emojis appropriately, include relevant hashtags, and make the content feel warm and inviting. Never include operating hours in your posts as they vary. Keep the location reference simple - just mention 'A Walk in the Park Cafe' or occasionally the full address (1491 Aster Ave, Akron, OH 44301) but don't invent other location details.";
    
    let result;
    
    // For text-only requests
    if (!data.image) {
      const textResponse = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: textPrompt }
        ],
        max_tokens: 500
      });
      
      result = textResponse.choices[0].message.content;
    } else {
      // For requests with images
      const base64Image = data.image.split(',')[1]; // Remove data URL prefix
      const imagePrompt = `${textPrompt}\n\nI've attached an image to use with this post. Include relevant aspects from this image in your social media post.`;
      
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
                image_url: { url: `data:image/jpeg;base64,${base64Image}` } 
              }
            ]
          }
        ],
        max_tokens: 500
      });
      
      result = imageResponse.choices[0].message.content;
    }
    
    return result || "Sorry, I couldn't generate a post at this time.";
    
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
