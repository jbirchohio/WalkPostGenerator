interface PostPreviewProps {
  text: string;
  image: string | null;
}

export default function PostPreview({ text, image }: PostPreviewProps) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white mb-6">
      {/* Preview Header */}
      <div className="bg-gray-100 px-4 py-2 flex items-center border-b border-gray-300">
        <div className="w-8 h-8 rounded-full bg-cafe-brown flex items-center justify-center text-white font-bold">A</div>
        <div className="ml-2">
          <p className="text-sm font-semibold">A Walk in the Park Cafe</p>
          <p className="text-xs text-gray-500">Just now</p>
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="p-4">
        <div className="text-sm mb-4 whitespace-pre-wrap">
          {text}
        </div>
        
        {image && (
          <div>
            <img 
              className="w-full h-auto rounded" 
              src={image} 
              alt="Post preview" 
            />
          </div>
        )}
      </div>
      
      {/* Preview Footer */}
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-300">
        <div className="flex items-center space-x-4 text-gray-500">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="ml-1 text-xs">Like</span>
          </div>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="ml-1 text-xs">Comment</span>
          </div>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="ml-1 text-xs">Share</span>
          </div>
        </div>
      </div>
    </div>
  );
}
