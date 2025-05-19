import { useState, useEffect } from "react";
import { Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type PostDraft } from "@/types";

interface SavedDraftsProps {
  onEditDraft: (draft: PostDraft) => void;
}

export default function SavedDrafts({ onEditDraft }: SavedDraftsProps) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);

  useEffect(() => {
    // Load drafts from localStorage
    const loadDrafts = () => {
      const draftsString = localStorage.getItem("cafeDrafts");
      if (draftsString) {
        try {
          const parsedDrafts = JSON.parse(draftsString);
          setDrafts(parsedDrafts);
        } catch (error) {
          console.error("Error parsing drafts:", error);
          setDrafts([]);
        }
      }
    };

    loadDrafts();
    
    // Set up event listener for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cafeDrafts") {
        loadDrafts();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleDeleteDraft = (id: number) => {
    const updatedDrafts = drafts.filter(draft => draft.id !== id);
    localStorage.setItem("cafeDrafts", JSON.stringify(updatedDrafts));
    setDrafts(updatedDrafts);
    
    toast({
      title: "Success",
      description: "Draft deleted successfully",
    });
  };

  const handleClearAllDrafts = () => {
    localStorage.removeItem("cafeDrafts");
    setDrafts([]);
    
    toast({
      title: "Success",
      description: "All drafts cleared",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="mt-8 bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-cafe-brown">Saved Drafts</h3>
          {drafts.length > 0 && (
            <Button 
              variant="ghost" 
              onClick={handleClearAllDrafts}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </Button>
          )}
        </div>
        
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2">No saved drafts yet</p>
            </div>
          ) : (
            drafts.map(draft => (
              <div 
                key={draft.id} 
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-cafe-brown">{draft.product}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {draft.text.substring(0, 100)}{draft.text.length > 100 ? '...' : ''}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-cafe-brown hover:text-cafe-lightBrown"
                      onClick={() => onEditDraft(draft)}
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteDraft(draft.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Saved on {formatDate(draft.date)}</div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
