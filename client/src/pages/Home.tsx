import { useState } from "react";
import PostGenerator from "@/components/PostGenerator";
import SavedDrafts from "@/components/SavedDrafts";
import { type PostDraft } from "@/types";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState<PostDraft | null>(null);

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
