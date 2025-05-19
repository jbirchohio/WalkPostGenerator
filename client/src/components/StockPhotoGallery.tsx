import { Card, CardContent } from "@/components/ui/card";

interface StockPhotoGalleryProps {
  onSelectImage: (imageUrl: string) => void;
}

export default function StockPhotoGallery({ onSelectImage }: StockPhotoGalleryProps) {
  // Stock photos collection
  const stockPhotos = {
    foodItems: [
      {
        url: "https://images.unsplash.com/photo-1541167760496-1628856ab772?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Latte with leaf art"
      },
      {
        url: "https://pixabay.com/get/g4a5005f60a67c30905f3e5dcf5b1d49eca60b6e172a980a8b53c5d3a737513ff350fa4b8c4b15032d0e0600786421f96048be224a1df88a419febe5995ed932f_1280.jpg",
        alt: "Avocado toast"
      },
      {
        url: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Blueberry muffin"
      },
      {
        url: "https://images.unsplash.com/photo-1494314671902-399b18174975?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Croissant with coffee"
      },
      {
        url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Sandwich on plate"
      },
      {
        url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Berry cake slice"
      }
    ],
    cafeAmbiance: [
      {
        url: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Cozy cafe interior"
      },
      {
        url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Barista preparing coffee"
      },
      {
        url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Coffee shop window"
      },
      {
        url: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Cafe tables and chairs"
      }
    ],
    parkScenery: [
      {
        url: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Autumn park path"
      },
      {
        url: "https://pixabay.com/get/g5c0a758006ace93f73adb25df8dbd0c13ae409feba128f9c4af3377d45cebb7126d6eca27c58cce3c3dd4f6a2168c2d8d8bba26baf055830350ed50e3f39b15f_1280.jpg",
        alt: "Park bench with coffee"
      },
      {
        url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Park with flowers"
      },
      {
        url: "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=400",
        alt: "Park with green trees"
      }
    ]
  };

  return (
    <Card className="mt-8 bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-cafe-brown mb-4">Stock Photos</h3>
        <p className="text-sm text-gray-600 mb-4">Click on an image to use it in your post</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Cafe Food Items */}
          <div className="col-span-2 md:col-span-3 mt-2 mb-1">
            <h4 className="text-md font-medium text-cafe-brown">Cafe Food Items</h4>
          </div>

          {stockPhotos.foodItems.map((photo, index) => (
            <div 
              key={`food-${index}`}
              className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onSelectImage(photo.url)}
            >
              <img 
                src={photo.url} 
                alt={photo.alt} 
                className="w-full h-36 object-cover"
              />
            </div>
          ))}

          {/* Coffee Shop Ambiance */}
          <div className="col-span-2 md:col-span-3 mt-4 mb-1">
            <h4 className="text-md font-medium text-cafe-brown">Coffee Shop Ambiance</h4>
          </div>

          {stockPhotos.cafeAmbiance.map((photo, index) => (
            <div 
              key={`ambiance-${index}`}
              className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onSelectImage(photo.url)}
            >
              <img 
                src={photo.url} 
                alt={photo.alt} 
                className="w-full h-36 object-cover"
              />
            </div>
          ))}

          {/* Park Scenery */}
          <div className="col-span-2 md:col-span-3 mt-4 mb-1">
            <h4 className="text-md font-medium text-cafe-brown">Park Scenery</h4>
          </div>

          {stockPhotos.parkScenery.map((photo, index) => (
            <div 
              key={`park-${index}`}
              className="rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onSelectImage(photo.url)}
            >
              <img 
                src={photo.url} 
                alt={photo.alt} 
                className="w-full h-36 object-cover"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
