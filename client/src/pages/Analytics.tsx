import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Facebook, Instagram, Heart, MessageSquare, Share2 } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch analytics summary on component mount
  useEffect(() => {
    fetchAnalyticsSummary();
  }, []);

  // Function to fetch analytics summary from the API
  const fetchAnalyticsSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('GET', '/api/analytics/summary');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to fetch analytics summary');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching analytics');
    } finally {
      setLoading(false);
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
    { name: 'Shares', value: analyticsData.metrics.totalShares },
    { name: 'Comments', value: analyticsData.metrics.totalComments },
    { name: 'Clicks', value: analyticsData.metrics.totalClicks },
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
      <h1 className="text-3xl font-bold mb-6 text-cafe-brown">Analytics Dashboard</h1>
      
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