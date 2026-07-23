import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Index from "./pages/Index";
import StudentIndex from "./pages/StudentIndex";
import TripPage from "./pages/TripPage";
import BookingSuccess from "./pages/BookingSuccess";
import SquadHub from "./pages/SquadHub";
import StudentSquadHub from "./pages/StudentSquadHub";
import SquadRegister from "./pages/SquadRegister";
import StudentSquadRegister from "./pages/StudentSquadRegister";
import SquadDashboard from "./pages/SquadDashboard";
import SquadLogin from "./pages/SquadLogin";
import SquadForgotPassword from "./pages/SquadForgotPassword";
import SquadResetPassword from "./pages/SquadResetPassword";
import Admin from "./pages/Admin";
import StaffLeaderboardPage from "./pages/StaffLeaderboardPage";
import PayBalance from "./pages/PayBalance";

import NotFound from "./pages/NotFound";
import { gtmPushEvent } from "@/utils/gtmTracker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function ConditionalNavbar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname.startsWith("/students/admin")) return null;
  return <Navbar />;
}

// GTM's container fires its own page_view once on first load. This only
// pushes on subsequent client-side route changes (SPA "virtual" pageviews),
// mirroring the main site's routeChangeComplete-based tracking.
function RouteChangeTracker() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    gtmPushEvent("page_view", {
      page_location: window.location.href,
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={typeof window !== "undefined" && window.location.pathname.startsWith("/all-in-trips") ? "/all-in-trips" : "/"}>
        <ConditionalNavbar />
        <ScrollToTop />
        <RouteChangeTracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/pay-balance" element={<PayBalance />} />
          <Route path="/squad-leader" element={<SquadHub />} />
          <Route path="/squad-leader/register" element={<SquadRegister />} />
          <Route path="/squad-leader/login" element={<SquadLogin />} />
          <Route path="/squad-leader/forgot-password" element={<SquadForgotPassword />} />
          <Route path="/squad-leader/reset-password" element={<SquadResetPassword />} />
          <Route path="/squad-leader/dashboard" element={<SquadDashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/staff-leaderboard" element={<StaffLeaderboardPage />} />
          <Route path="/vietnam" element={<TripPage />} />
          <Route path="/vietnam-7" element={<TripPage />} />
          <Route path="/cambodia" element={<TripPage />} />
          <Route path="/indonesia" element={<TripPage />} />
          <Route path="/indonesia-7" element={<TripPage />} />

          {/* Student variant */}
          <Route path="/students" element={<StudentIndex />} />
          <Route path="/students/vietnam" element={<TripPage />} />
          <Route path="/students/vietnam-7" element={<TripPage />} />
          <Route path="/students/cambodia" element={<Navigate to="/students" replace />} />
          <Route path="/students/indonesia" element={<TripPage />} />
          <Route path="/students/indonesia-7" element={<TripPage />} />

          <Route path="/students/squad-leader" element={<StudentSquadHub />} />
          <Route path="/students/squad-leader/register" element={<StudentSquadRegister />} />
          <Route path="/students/squad-leader/login" element={<SquadLogin />} />
          <Route path="/students/squad-leader/forgot-password" element={<SquadForgotPassword />} />
          <Route path="/students/squad-leader/reset-password" element={<SquadResetPassword />} />
          <Route path="/students/squad-leader/dashboard" element={<SquadDashboard />} />
          <Route path="/students/admin" element={<Admin />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
