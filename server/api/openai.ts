import OpenAI from "openai";
import { PostGenerationRequest } from "@shared/schema";

// Use the provided API credentials
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "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"
});

// The OpenAI Assistant ID
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || "asst_Tjl2yMLdhaOav1RMT6gAC8so";

/**
 * Generate a social media post for A Walk in the Park Cafe
 */
export async function generatePostWithOpenAI(data: PostGenerationRequest): Promise<string> {
  try {
    let content = [];
    
    // Add text instruction
    const textPrompt = buildPrompt(data);
    content.push({
      type: "text",
      text: textPrompt
    });
    
    // Add image if provided
    if (data.image) {
      const base64Image = data.image.split(',')[1]; // Remove data URL prefix
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      });
    }
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a social media manager for 'A Walk in the Park Cafe', a cozy cafe located next to a beautiful park. Your task is to create engaging, authentic content for Instagram and Facebook that highlights the cafe's products, ambiance, and connection to nature. Use emojis appropriately, include relevant hashtags, and make the content feel warm and inviting."
        },
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "Sorry, I couldn't generate a post at this time.";
    
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to generate post: ${error.message}`);
  }
}

/**
 * Build the prompt for OpenAI based on the request data
 */
function buildPrompt(data: PostGenerationRequest): string {
  let prompt = "Create a social media post for 'A Walk in the Park Cafe'";
  
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
  prompt += " Include relevant emojis and hashtags. Format it like a professional social media post that's ready to be published on Facebook or Instagram.";
  
  return prompt;
}
