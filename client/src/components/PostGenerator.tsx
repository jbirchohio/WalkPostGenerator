import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import ImageUploader from "./ImageUploader";
import PostPreview from "./PostPreview";
import { type PostDraft, type GeneratePostRequest } from "@/types";

interface PostGeneratorProps {
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
  currentDraft: PostDraft | null;
  setCurrentDraft: (draft: PostDraft | null) => void;
}

interface FormValues {
  productName: string;
  postType: "general" | "promotion" | "event" | "seasonal";
}

export default function PostGenerator({ 
  selectedImage, 
  setSelectedImage, 
  currentDraft, 
  setCurrentDraft 
}: PostGeneratorProps) {
  const { toast } = useToast();
  const [generatedPost, setGeneratedPost] = useState<string | null>(
    currentDraft ? currentDraft.text : null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      productName: currentDraft?.product || "",
      postType: currentDraft?.postType || "general",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: GeneratePostRequest) => {
      const response = await apiRequest("POST", "/api/generate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPost(data.text);
      setIsGenerating(false);
      
      // Scroll to results
      document.getElementById("resultsContainer")?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: `Failed to generate post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleGeneratePost = (values: FormValues) => {
    setIsGenerating(true);
    const requestData: GeneratePostRequest = {
      productName: values.productName || undefined,
      postType: values.postType,
      image: selectedImage || undefined,
    };
    
    generateMutation.mutate(requestData);
  };

  const handleSaveAsDraft = () => {
    if (!generatedPost) return;
    
    const draft: PostDraft = {
      id: Date.now(),
      text: generatedPost,
      image: selectedImage,
      product: form.getValues("productName") || "Untitled Post",
      postType: form.getValues("postType"),
      date: new Date().toISOString(),
    };
    
    // Get existing drafts
    const draftsString = localStorage.getItem("cafeDrafts");
    const drafts: PostDraft[] = draftsString ? JSON.parse(draftsString) : [];
    
    // Add new draft
    drafts.push(draft);
    
    // Save back to localStorage
    localStorage.setItem("cafeDrafts", JSON.stringify(drafts));
    
    toast({
      title: "Success",
      description: "Draft saved successfully!",
    });
  };

  const handleCopyToClipboard = () => {
    if (!generatedPost) return;
    
    navigator.clipboard.writeText(generatedPost)
      .then(() => {
        toast({
          title: "Success",
          description: "Post copied to clipboard!",
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: `Failed to copy text: ${err.message}`,
          variant: "destructive",
        });
      });
  };

  const handleShareToFacebook = async () => {
    if (!generatedPost) return;
    
    try {
      toast({
        title: "Posting",
        description: "Posting to Facebook, please wait...",
      });
      
      // Call our backend to post directly to Facebook
      const response = await apiRequest("POST", "/api/facebook/post", {
        message: generatedPost,
        image: selectedImage || undefined
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Posted directly to Facebook!",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to post to Facebook",
          variant: "destructive",
        });
      }
    } catch (error: any) { // Explicitly type error as any
      console.error("Error posting to Facebook:", error);
      toast({
        title: "Error",
        description: "Failed to post to Facebook: " + (error?.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleShareToInstagram = async () => {
    if (!generatedPost) return;
    
    if (!selectedImage) {
      toast({
        title: "Image Required",
        description: "Instagram posting requires an image. Please add an image to your post.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      toast({
        title: "Posting",
        description: "Posting to Instagram, please wait...",
      });
      
      // Call our backend to post directly to Instagram
      const response = await apiRequest("POST", "/api/instagram/post", {
        message: generatedPost,
        image: selectedImage
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Posted directly to Instagram!",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to post to Instagram",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error posting to Instagram:", error);
      toast({
        title: "Error",
        description: "Failed to post to Instagram: " + (error?.message || "Unknown error"),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-lg p-6 max-w-3xl mx-auto border-2 border-[#ffd700]">
      <CardContent className="p-0">
        {/* Instructions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-black mb-2">Create a Social Media Post</h2>
          <p className="text-black">Generate engaging content for your Facebook or Instagram posts using AI.</p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form 
            id="postGeneratorForm" 
            className="space-y-6" 
            onSubmit={form.handleSubmit(handleGeneratePost)}
          >
            {/* Image Uploader */}
            <ImageUploader 
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />

            {/* Product Input */}
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Product Name (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="E.g. Autumn Spice Latte, Blueberry Muffin, etc." 
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-cafe-brown focus:border-cafe-brown"
                      {...field}
                    />
                  </FormControl>
                  <p className="mt-1 text-xs text-gray-500">Add a featured product to highlight in your post</p>
                </FormItem>
              )}
            />

            {/* Post Type Selection */}
            <FormField
              control={form.control}
              name="postType"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-gray-700">Post Type</FormLabel>
                  <FormControl>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="general" id="general" />
                        <Label htmlFor="general">General</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="promotion" id="promotion" />
                        <Label htmlFor="promotion">Promotion</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="event" id="event" />
                        <Label htmlFor="event">Event</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="seasonal" id="seasonal" />
                        <Label htmlFor="seasonal">Seasonal</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Generate Button - Black and Yellow */}
            <Button 
              type="submit"
              className="w-full py-4 px-6 bg-[#ffd700] hover:bg-[#ccaa00] text-black font-bold text-lg rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffd700] transition-colors"
              disabled={isGenerating}
            >
              <div className="flex items-center justify-center">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Brewing your post...</span>
                  </>
                ) : (
                  <>
                    <span>GENERATE POST</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </div>
            </Button>
          </form>
        </Form>

        {/* Results */}
        {generatedPost && (
          <div id="resultsContainer" className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-cafe-brown mb-4">Generated Post</h3>
            
            {/* Social Media Preview */}
            <PostPreview 
              text={generatedPost} 
              image={selectedImage}
            />
            
            {/* Action Buttons */}
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-700">Share your post:</h4>
              
              {/* Social Media Share Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleShareToFacebook}
                  className="flex-1 py-3 px-4 bg-black hover:bg-[#303030] text-[#ffd700] font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffd700] transition-colors flex justify-center items-center"
                >
                  <Facebook className="h-5 w-5 mr-2" />
                  Share to Facebook
                </Button>
                <Button
                  onClick={handleShareToInstagram}
                  className="flex-1 py-3 px-4 bg-black hover:bg-[#303030] text-[#ffd700] font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffd700] transition-colors flex justify-center items-center"
                >
                  <Instagram className="h-5 w-5 mr-2" />
                  Share to Instagram
                </Button>
              </div>
              
              {/* Utility Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                <Button
                  onClick={handleCopyToClipboard}
                  className="flex-1 py-2 px-4 bg-[#ffd700] hover:bg-[#ccaa00] text-black font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffd700] transition-colors flex justify-center items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={handleSaveAsDraft}
                  variant="outline"
                  className="flex-1 py-2 px-4 border border-black text-black bg-white hover:bg-[#f0f0f0] font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffd700] transition-colors flex justify-center items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleGeneratePost(form.getValues())}
                  variant="secondary"
                  className="flex-1 py-2 px-4 bg-black hover:bg-[#303030] text-[#ffd700] font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ffd700] transition-colors flex justify-center items-center"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
