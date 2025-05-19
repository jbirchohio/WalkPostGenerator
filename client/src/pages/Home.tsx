import { useState, useEffect } from "react";
import PostGenerator from "@/components/PostGenerator";
import SavedDrafts from "@/components/SavedDrafts";
import { type PostDraft } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<PostDraft | null>(null);
  const [processingScheduled, setProcessingScheduled] = useState(false);

  // Check for scheduled posts that need to be published
  useEffect(() => {
    const checkScheduledPosts = () => {
      try {
        // Get scheduled posts from localStorage
        const scheduledPostsString = localStorage.getItem("cafeScheduledPosts");
        if (!scheduledPostsString) return;
        
        const scheduledPosts = JSON.parse(scheduledPostsString);
        const now = new Date();
        const updatedPosts = [];
        let postsToPublish = false;
        
        // Look for posts that should be published now
        for (const post of scheduledPosts) {
          const scheduledDate = new Date(post.scheduledDate);
          
          // If scheduled time has passed, publish the post
          if (scheduledDate <= now) {
            postsToPublish = true;
            
            // For each platform, publish the post
            if (post.platforms && post.platforms.length > 0) {
              // Post to each platform
              for (const platform of post.platforms) {
                publishToSocialMedia(post, platform);
              }
            }
          } else {
            // Keep posts that should be published in the future
            updatedPosts.push(post);
          }
        }
        
        // Update the scheduled posts list
        localStorage.setItem("cafeScheduledPosts", JSON.stringify(updatedPosts));
        
        if (postsToPublish) {
          toast({
            title: "Posts Published",
            description: "Your scheduled posts have been published to Facebook and Instagram",
          });
        }
      } catch (error) {
        console.error("Error processing scheduled posts:", error);
      } finally {
        setProcessingScheduled(false);
      }
    };
    
    // Only run once when component mounts
    if (!processingScheduled) {
      setProcessingScheduled(true);
      checkScheduledPosts();
    }
    
    // Set up interval to check every minute
    const interval = setInterval(checkScheduledPosts, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [toast]);
  
  // Publish to a specific social media platform
  const publishToSocialMedia = async (post: any, platform: string) => {
    try {
      const endpoint = platform === 'facebook' ? '/api/facebook/post' : '/api/instagram/post';
      
      const payload = {
        message: post.message,
        image: post.image,
        postType: post.postType,
        productName: post.productName
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || result.message || `Error posting to ${platform}`);
      }
      
      console.log(`Post published to ${platform} successfully`);
    } catch (error: any) {
      console.error(`Error publishing to ${platform}:`, error);
      toast({
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Posting Error`,
        description: error.message || `Something went wrong posting to ${platform}`,
        variant: "destructive",
      });
    }
  };

  // This function will be passed to SavedDrafts to load a draft for editing
  const handleEditDraft = (draft: PostDraft) => {
    setCurrentDraft(draft);
    if (draft.image) {
      setSelectedImage(draft.image);
    }
    // Scroll to form
    document.getElementById("postGeneratorForm")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen pb-16 relative bg-white">
      {/* Header */}
      <header className="bg-black text-[#ffd700] shadow-md">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">A Walk in the Park Cafe</h1>
          <p className="text-sm md:text-base">Post Generator</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <PostGenerator 
          selectedImage={selectedImage} 
          setSelectedImage={setSelectedImage} 
          currentDraft={currentDraft}
          setCurrentDraft={setCurrentDraft}
        />
        <SavedDrafts onEditDraft={handleEditDraft} />
      </main>

      {/* Footer */}
      <footer className="bg-black text-[#ffd700] py-4 text-center text-sm fixed bottom-0 w-full">
        <p>&copy; {new Date().getFullYear()} A Walk in the Park Cafe - Post Generator</p>
      </footer>
    </div>
  );
}
