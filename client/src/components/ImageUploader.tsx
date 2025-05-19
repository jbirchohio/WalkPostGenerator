import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImageUploaderProps {
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
}

export default function ImageUploader({ selectedImage, setSelectedImage }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTakePictureClick = () => {
    cameraInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      alert(`Image is too large. Please select an image under ${maxSizeMB}MB.`);
      return;
    }

    // Compress and resize image before setting it
    compressImage(file, 1200, 0.7);
  };

  // Function to compress and resize images
  const compressImage = (file: File, maxWidth: number, quality: number) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions if needed
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Get compressed image
        const compressedImageData = canvas.toDataURL('image/jpeg', quality);
        setSelectedImage(compressedImageData);
      };
    };
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
      {selectedImage ? (
        <div className="mb-4">
          <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
            <img 
              src={selectedImage} 
              className="w-full h-full object-cover" 
              alt="Preview of uploaded image" 
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">Add an image (optional)</p>
          <div className="flex flex-col sm:flex-row justify-center mt-3 gap-3">
            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-cafe-brown bg-white border border-cafe-brown rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cafe-brown"
              onClick={handleUploadClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </Button>
            <Button
              type="button"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-black border border-yellow-400 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
              onClick={handleTakePictureClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Picture
            </Button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*" 
            className="hidden" 
            onChange={handleImageChange}
          />
          {/* Use proper camera input for mobile devices */}
          <input 
            type="file" 
            ref={cameraInputRef}
            accept="image/*" 
            capture 
            className="hidden" 
            onChange={handleImageChange}
          />
        </div>
      )}
    </div>
  );
}
