import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import History from "@/pages/History";
import Analytics from "@/pages/Analytics";
import { BarChart2, History as HistoryIcon, Home as HomeIcon } from "lucide-react";

// Navigation component
function MainNavigation() {
  return (
    <nav className="bg-black text-[#ffd700] p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">A Walk in the Park Cafe</div>
        <div className="flex space-x-6">
          <Link href="/" className="flex items-center hover:underline">
            <HomeIcon className="w-4 h-4 mr-1" />
            Home
          </Link>
          <Link href="/history" className="flex items-center hover:underline">
            <HistoryIcon className="w-4 h-4 mr-1" />
            Post History
          </Link>
          <Link href="/analytics" className="flex items-center hover:underline">
            <BarChart2 className="w-4 h-4 mr-1" />
            Analytics
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <MainNavigation />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/history" component={History} />
          <Route path="/analytics" component={Analytics} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
