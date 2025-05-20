import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Facebook, Instagram, Heart, MessageSquare, Share2, RefreshCw, BarChart3, LineChart as LineChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Define the analytics summary type
interface AnalyticsSummary {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  metrics: {
    totalImpressions: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    totalClicks: number;
    totalEngagement: number;
  };
  recentPosts: Array<any>;
  postsByPlatform: Array<{
    platform: string;
    count: number;
  }>;
}

export default function Analytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("engagement");
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [postHistoryData, setPostHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { toast } = useToast();

  // Fetch analytics summary on component mount
  useEffect(() => {
    fetchAnalyticsSummary();
  }, []);

  // Fetch history data for the selected post
  useEffect(() => {
    if (selectedPost) {
      fetchPostHistory(selectedPost);
    }
  }, [selectedPost]);

  // Function to fetch analytics summary from the API
  const fetchAnalyticsSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('GET', '/api/analytics/summary');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
        
        // If we have recent posts and none is selected, select the first one for history graph
        if (data.summary?.recentPosts?.length > 0 && !selectedPost) {
          setSelectedPost(data.summary.recentPosts[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch analytics summary');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching analytics');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to refresh all posts analytics
  const refreshAllAnalytics = async () => {
    setRefreshingAll(true);
    
    try {
      const response = await apiRequest('POST', '/api/analytics/refresh-all');
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Analytics Refreshed",
          description: `Successfully refreshed analytics for ${data.refreshed} posts.`,
        });
        
        // Reload the summary data
        fetchAnalyticsSummary();
        
        // If we have a selected post, refresh its history too
        if (selectedPost) {
          fetchPostHistory(selectedPost);
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to refresh analytics",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while refreshing analytics",
        variant: "destructive"
      });
    } finally {
      setRefreshingAll(false);
    }
  };
  
  // Function to fetch history data for a specific post
  const fetchPostHistory = async (postId: number) => {
    setLoadingHistory(true);
    
    try {
      const response = await apiRequest('GET', `/api/posts/${postId}/analytics`);
      const data = await response.json();
      
      if (data.success && data.history) {
        setPostHistoryData(data.history);
      } else {
        setPostHistoryData(null);
        toast({
          title: "Notice",
          description: "No historical data available for this post yet. Try refreshing analytics."
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch post history",
        variant: "destructive"
      });
      setPostHistoryData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Function to generate demo data when real analytics are not available
  const generateDemoData = () => {
    return {
      totalPosts: 45,
      publishedPosts: 32,
      scheduledPosts: 8,
      metrics: {
        totalImpressions: 5840,
        totalLikes: 732,
        totalShares: 124,
        totalComments: 86,
        totalClicks: 218,
        totalEngagement: 942
      },
      recentPosts: [
        {
          id: 1,
          content: "Try our new seasonal pumpkin spice latte today! Perfect for the fall season.",
          postType: "seasonal",
          productName: "Pumpkin Spice Latte",
          publishStatus: "published",
          impressions: 1240,
          likes: 145,
          shares: 28,
          comments: 12,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          content: "Weekend special: Buy one get one free on all chocolate pastries!",
          postType: "promotion",
          productName: "Chocolate Pastries",
          publishStatus: "published",
          impressions: 980,
          likes: 98,
          shares: 45,
          comments: 8,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          content: "Join us for our monthly coffee tasting event - this Saturday at 2pm!",
          postType: "event",
          productName: null,
          publishStatus: "scheduled",
          impressions: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      postsByPlatform: [
        { platform: "facebook", count: 28 },
        { platform: "instagram", count: 24 }
      ]
    };
  };

  // Use demo data if no real data is available
  const analyticsData = summary || generateDemoData();

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Prepare data for charts
  const engagementData = [
    { name: 'Likes', value: analyticsData.metrics.totalLikes },
    { name: 'Comments', value: analyticsData.metrics.totalComments },
    { name: 'Shares', value: analyticsData.metrics.totalShares },
    { name: 'Saves', value: analyticsData.metrics.totalSaved || 0 },
    { name: 'Clicks', value: analyticsData.metrics.totalClicks },
  ];
  
  // Comprehensive metrics data for the stacked bar chart
  const metricsData = [
    { 
      name: 'Engagement', 
      facebook: analyticsData.metrics.facebookEngagement || 0,
      instagram: analyticsData.metrics.instagramEngagement || 0,
    },
    { 
      name: 'Impressions', 
      facebook: analyticsData.metrics.facebookImpressions || 0,
      instagram: analyticsData.metrics.instagramImpressions || 0,
    },
    { 
      name: 'Reach', 
      facebook: analyticsData.metrics.facebookReach || 0,
      instagram: analyticsData.metrics.instagramReach || 0,
    },
    { 
      name: 'Likes', 
      facebook: analyticsData.metrics.facebookLikes || 0,
      instagram: analyticsData.metrics.instagramLikes || 0,
    },
    { 
      name: 'Comments', 
      facebook: analyticsData.metrics.facebookComments || 0,
      instagram: analyticsData.metrics.instagramComments || 0,
    },
    { 
      name: 'Shares', 
      facebook: analyticsData.metrics.facebookShares || 0,
      instagram: analyticsData.metrics.instagramShares || 0,
    },
  ];

  const platformData = analyticsData.postsByPlatform.map(item => ({
    name: item.platform.charAt(0).toUpperCase() + item.platform.slice(1),
    value: item.count
  }));

  const statusData = [
    { name: 'Published', value: analyticsData.publishedPosts },
    { name: 'Scheduled', value: analyticsData.scheduledPosts },
    { name: 'Draft', value: analyticsData.totalPosts - analyticsData.publishedPosts - analyticsData.scheduledPosts },
  ];

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-cafe-brown">Analytics Dashboard</h1>
        <Button 
          onClick={refreshAllAnalytics} 
          disabled={refreshingAll || loading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshingAll ? 'animate-spin' : ''}`} />
          {refreshingAll ? 'Refreshing...' : 'Refresh All Analytics'}
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4">Loading analytics data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center p-8 text-red-500">
          <p>Error: {error}</p>
          <button 
            onClick={fetchAnalyticsSummary}
            className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="py-4 px-6">
                <CardTitle className="text-lg">Total Posts</CardTitle>
                <CardDescription>All-time</CardDescription>
              </CardHeader>
              <CardContent className="py-2 px-6">
                <p className="text-3xl font-bold">{analyticsData.totalPosts}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-4 px-6">
                <CardTitle className="text-lg">Engagement</CardTitle>
                <CardDescription>Likes + Shares + Comments</CardDescription>
              </CardHeader>
              <CardContent className="py-2 px-6">
                <p className="text-3xl font-bold">{formatNumber(analyticsData.metrics.totalEngagement)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-4 px-6">
                <CardTitle className="text-lg">Impressions</CardTitle>
                <CardDescription>Total views</CardDescription>
              </CardHeader>
              <CardContent className="py-2 px-6">
                <p className="text-3xl font-bold">{formatNumber(analyticsData.metrics.totalImpressions)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-4 px-6">
                <CardTitle className="text-lg">Platforms</CardTitle>
                <CardDescription>Active platforms</CardDescription>
              </CardHeader>
              <CardContent className="py-2 px-6">
                <p className="text-3xl font-bold">{analyticsData.postsByPlatform.length}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Analytics */}
          <Tabs defaultValue="engagement" className="mt-8">
            <TabsList className="mb-4">
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="status">Post Status</TabsTrigger>
              <TabsTrigger value="history">Metrics Over Time</TabsTrigger>
            </TabsList>
            
            <TabsContent value="engagement">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>Breakdown of user interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={engagementData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatNumber(value as number)} />
                        <Legend />
                        <Bar dataKey="value" name="Count" fill="#ffd700" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div>
                    <CardTitle>Metrics Over Time</CardTitle>
                    <CardDescription>Track performance of posts across platforms</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <Select
                      value={selectedPost?.toString() || ""}
                      onValueChange={(value) => setSelectedPost(parseInt(value))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Post" />
                      </SelectTrigger>
                      <SelectContent>
                        {analyticsData.recentPosts.map((post) => (
                          <SelectItem key={post.id} value={post.id.toString()}>
                            {post.productName || post.postType} ({post.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedMetric}
                      onValueChange={setSelectedMetric}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="impressions">Impressions</SelectItem>
                        <SelectItem value="likes">Likes</SelectItem>
                        <SelectItem value="comments">Comments</SelectItem>
                        <SelectItem value="shares">Shares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex justify-center items-center h-80">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                        <p className="mt-4">Loading history data...</p>
                      </div>
                    </div>
                  ) : !postHistoryData ? (
                    <div className="flex justify-center items-center h-80">
                      <div className="text-center">
                        <p className="text-gray-500">No historical data available for this post.</p>
                        <p className="text-gray-500 mt-2">Try refreshing analytics to collect data points.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={postHistoryData.dates.map((date: string, index: number) => ({
                            date,
                            facebook: postHistoryData.facebook[selectedMetric][index] || 0,
                            instagram: postHistoryData.instagram[selectedMetric][index] || 0
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            type="category"
                            tickFormatter={(date) => {
                              return new Date(date).toLocaleDateString();
                            }}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value) => formatNumber(value as number)}
                            labelFormatter={(label) => {
                              return new Date(label as string).toLocaleDateString();
                            }}
                          />
                          <Legend />
                          
                          <Line
                            name="Facebook"
                            type="monotone"
                            dataKey="facebook"
                            stroke="#4267B2"
                            activeDot={{ r: 8 }}
                            connectNulls
                          />
                          
                          <Line
                            name="Instagram"
                            type="monotone"
                            dataKey="instagram"
                            stroke="#E1306C"
                            activeDot={{ r: 8 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedPost) {
                        fetchPostHistory(selectedPost);
                      }
                    }}
                    disabled={!selectedPost || loadingHistory}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                    {loadingHistory ? 'Refreshing...' : 'Refresh Data'}
                  </Button>
                  
                  <div className="text-xs text-gray-500">
                    {postHistoryData?.dates?.length 
                      ? `${postHistoryData.dates.length} data point${postHistoryData.dates.length > 1 ? 's' : ''}`
                      : 'No data points'
                    }
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="platforms">
              <Card>
                <CardHeader>
                  <CardTitle>Posts by Platform</CardTitle>
                  <CardDescription>Distribution across social media</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatNumber(value as number)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>Posts by Status</CardTitle>
                  <CardDescription>Distribution by publishing status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatNumber(value as number)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Recent Posts */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Latest content performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Content</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Platforms</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Impressions</th>
                      <th className="text-right py-3 px-4">Likes</th>
                      <th className="text-right py-3 px-4">Comments</th>
                      <th className="text-right py-3 px-4">Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.recentPosts.map((post) => (
                      <tr key={post.id} className="border-b">
                        <td className="py-3 px-4 max-w-[300px] truncate">
                          {post.content}
                        </td>
                        <td className="py-3 px-4 capitalize">{post.postType}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            {post.publishedTo ? (
                              post.publishedTo.map((platform: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center">
                                  {platform === 'facebook' ? (
                                    <Facebook className="h-4 w-4 text-blue-600 mr-1" />
                                  ) : (
                                    <Instagram className="h-4 w-4 text-pink-600 mr-1" />
                                  )}
                                </span>
                              ))
                            ) : post.publishStatus === 'published' ? (
                              <>
                                <span className="inline-flex items-center">
                                  <Facebook className="h-4 w-4 text-blue-600 mr-1" />
                                </span>
                                <span className="inline-flex items-center">
                                  <Instagram className="h-4 w-4 text-pink-600 mr-1" />
                                </span>
                              </>
                            ) : (
                              "Not published"
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">{post.publishStatus}</td>
                        <td className="py-3 px-4 text-right">
                          {formatNumber(post.impressions)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatNumber(post.likes || 0)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatNumber(post.comments || 0)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatNumber(post.shares || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}