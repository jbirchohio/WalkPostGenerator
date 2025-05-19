import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface PostEditorProps {
  open: boolean;
  onClose: () => void;
  initialText: string;
  onSave: (text: string) => void;
}

export default function PostEditor({ open, onClose, initialText, onSave }: PostEditorProps) {
  const [editedText, setEditedText] = useState(initialText);

  const handleSave = () => {
    onSave(editedText);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Post</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          <Textarea
            className="min-h-[200px] p-3 w-full"
            placeholder="Edit your post text..."
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
          />
        </div>
        
        <DialogFooter>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-black text-yellow-400 hover:bg-gray-800">
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}