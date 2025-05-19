import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Eye, Edit, Trash2, Clock } from "lucide-react";
import PostPreview from "@/components/PostPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Define types for the posts
interface Post {
  id: number;
  content: string;
  image: string | null;
  postType: string;
  productName: string | null;
  publishStatus: string;
  publishedTo: string[] | null;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
  engagement: number;
  impressions: number;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
}

export default function History() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [postsPerPage] = useState(10);
  const [currentPostType, setCurrentPostType] = useState<string | undefined>(undefined);
  const [currentStatus, setCurrentStatus] = useState<string | undefined>(undefined);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const { toast } = useToast();

  // Fetch posts on component mount and when filters change
  useEffect(() => {
    fetchPosts();
  }, [currentPage, currentPostType, currentStatus]);

  // Function to fetch posts from the API
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = (currentPage - 1) * postsPerPage;
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: postsPerPage.toString(),
        offset: offset.toString(),
      });
      
      if (currentPostType) {
        params.append('postType', currentPostType);
      }
      
      if (currentStatus) {
        params.append('publishStatus', currentStatus);
      }
      
      // Make the API request
      const response = await apiRequest('GET', `/api/posts?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
        setTotalPosts(data.count);
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching posts');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle post deletion
  const handleDelete = async (id: number) => {
    try {
      const response = await apiRequest('DELETE', `/api/posts/${id}`);
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Post deleted successfully",
        });
        
        // Refresh the posts list
        fetchPosts();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete post",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setConfirmDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to handle pagination
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-cafe-brown">Post History</h1>
      
      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger 
            value="all" 
            onClick={() => setCurrentStatus(undefined)}
          >
            All Posts
          </TabsTrigger>
          <TabsTrigger 
            value="published" 
            onClick={() => setCurrentStatus('published')}
          >
            Published
          </TabsTrigger>
          <TabsTrigger 
            value="draft" 
            onClick={() => setCurrentStatus('draft')}
          >
            Drafts
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled" 
            onClick={() => setCurrentStatus('scheduled')}
          >
            Scheduled
          </TabsTrigger>
        </TabsList>
        
        <div className="flex justify-between items-center mt-4 mb-2">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPostType(undefined)}
              className={!currentPostType ? "bg-black text-[#ffd700]" : ""}
            >
              All Types
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPostType('general')}
              className={currentPostType === 'general' ? "bg-black text-[#ffd700]" : ""}
            >
              General
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPostType('promotion')}
              className={currentPostType === 'promotion' ? "bg-black text-[#ffd700]" : ""}
            >
              Promotion
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPostType('event')}
              className={currentPostType === 'event' ? "bg-black text-[#ffd700]" : ""}
            >
              Event
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPostType('seasonal')}
              className={currentPostType === 'seasonal' ? "bg-black text-[#ffd700]" : ""}
            >
              Seasonal
            </Button>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-4">
          {/* Posts table content rendered directly */}
          {loading ? (
            <p className="text-center py-8">Loading posts...</p>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error: {error}</p>
              <Button 
                variant="outline"
                onClick={fetchPosts}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No posts found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>{post.id}</TableCell>
                      <TableCell className="capitalize">{post.postType}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {post.content.substring(0, 50)}...
                      </TableCell>
                      <TableCell>{post.productName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            post.publishStatus === "published"
                              ? "bg-green-100 text-green-800"
                              : post.publishStatus === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {post.publishStatus === "scheduled" && <Clock className="w-3 h-3 mr-1" />}
                          {post.publishStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(post.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPost(post);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              // TODO: Implement edit functionality
                              toast({
                                title: "Edit",
                                description: "Edit functionality coming soon!",
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteId(post.id);
                              setConfirmDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * postsPerPage + 1} to{" "}
                  {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts} posts
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="published" className="mt-4">
          {/* Same content as above but filtered by currentStatus from the tab */}
          {/* This is handled by the useEffect changing the currentStatus state */}
          {loading ? (
            <p className="text-center py-8">Loading posts...</p>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error: {error}</p>
              <Button variant="outline" onClick={fetchPosts} className="mt-2">Try Again</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No published posts found</p>
            </div>
          ) : (
            <>
              {/* Same table structure as above */}
              <Table>
                {/* Table content same as above */}
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>{post.id}</TableCell>
                      <TableCell className="capitalize">{post.postType}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {post.content.substring(0, 50)}...
                      </TableCell>
                      <TableCell>{post.productName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          {post.publishStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(post.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedPost(post);
                            setViewDialogOpen(true);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setDeleteId(post.id);
                            setConfirmDeleteOpen(true);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * postsPerPage + 1} to{" "}
                  {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts} posts
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="draft" className="mt-4">
          {/* Content for draft posts tab - similar structure */}
          {loading ? (
            <p className="text-center py-8">Loading posts...</p>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error: {error}</p>
              <Button variant="outline" onClick={fetchPosts} className="mt-2">Try Again</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No draft posts found</p>
            </div>
          ) : (
            <>
              {/* Same table structure as above */}
              <Table>
                {/* Table content */}
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      {/* Similar cell structure as above */}
                      <TableCell>{post.id}</TableCell>
                      <TableCell className="capitalize">{post.postType}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {post.content.substring(0, 50)}...
                      </TableCell>
                      <TableCell>{post.productName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-800">
                          {post.publishStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(post.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedPost(post);
                            setViewDialogOpen(true);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setDeleteId(post.id);
                            setConfirmDeleteOpen(true);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * postsPerPage + 1} to{" "}
                  {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts} posts
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="scheduled" className="mt-4">
          {loading ? (
            <p className="text-center py-8">Loading posts...</p>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error: {error}</p>
              <Button variant="outline" onClick={fetchPosts} className="mt-2">Try Again</Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No scheduled posts found</p>
            </div>
          ) : (
            <>
              {/* Same table structure as above */}
              <Table>
                {/* Table content */}
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      {/* Similar cell structure as above */}
                      <TableCell>{post.id}</TableCell>
                      <TableCell className="capitalize">{post.postType}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {post.content.substring(0, 50)}...
                      </TableCell>
                      <TableCell>{post.productName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {post.publishStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(post.scheduledDate || '')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedPost(post);
                            setViewDialogOpen(true);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setDeleteId(post.id);
                            setConfirmDeleteOpen(true);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * postsPerPage + 1} to{" "}
                  {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts} posts
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* View Post Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
          </DialogHeader>
          
          {selectedPost && (
            <div className="mt-4">
              <PostPreview 
                text={selectedPost.content}
                image={selectedPost.image}
              />
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Post Type:</span>
                  <span className="capitalize">{selectedPost.postType}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Product:</span>
                  <span>{selectedPost.productName || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Status:</span>
                  <span className="capitalize">{selectedPost.publishStatus}</span>
                </div>
                
                {selectedPost.scheduledDate && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Scheduled For:</span>
                    <span>{formatDate(selectedPost.scheduledDate)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Created:</span>
                  <span>{formatDate(selectedPost.createdAt)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Last Updated:</span>
                  <span>{formatDate(selectedPost.updatedAt)}</span>
                </div>
                
                {selectedPost.publishedTo && selectedPost.publishedTo.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Published To:</span>
                    <div className="flex gap-1">
                      {selectedPost.publishedTo.map(platform => (
                        <Badge key={platform} className="capitalize">{platform}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Engagement Metrics</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-2 text-center">
                    <div className="text-sm text-gray-500">Impressions</div>
                    <div className="text-xl font-bold">{selectedPost.impressions}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-sm text-gray-500">Likes</div>
                    <div className="text-xl font-bold">{selectedPost.likes}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-sm text-gray-500">Shares</div>
                    <div className="text-xl font-bold">{selectedPost.shares}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-sm text-gray-500">Comments</div>
                    <div className="text-xl font-bold">{selectedPost.comments}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-sm text-gray-500">Clicks</div>
                    <div className="text-xl font-bold">{selectedPost.clicks}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-sm text-gray-500">Total Engagement</div>
                    <div className="text-xl font-bold">{selectedPost.engagement}</div>
                  </Card>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="py-4">Are you sure you want to delete this post? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}