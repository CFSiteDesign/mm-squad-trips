import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import Index from "./pages/Index";
import TripPage from "./pages/TripPage";
import BookingSuccess from "./pages/BookingSuccess";
import SquadHub from "./pages/SquadHub";
import SquadRegister from "./pages/SquadRegister";
import SquadDashboard from "./pages/SquadDashboard";
import SquadLogin from "./pages/SquadLogin";
import SquadForgotPassword from "./pages/SquadForgotPassword";
import SquadResetPassword from "./pages/SquadResetPassword";
// SquadAdmin is now embedded inside Admin at /admin
import Admin from "./pages/Admin";

import NotFound from "./pages/NotFound";

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
  if (pathname.startsWith("/admin")) return null;
  return <Navbar />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ConditionalNavbar />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/squad-leader" element={<SquadHub />} />
          <Route path="/squad-leader/register" element={<SquadRegister />} />
          <Route path="/squad-leader/login" element={<SquadLogin />} />
          <Route path="/squad-leader/forgot-password" element={<SquadForgotPassword />} />
          <Route path="/squad-leader/reset-password" element={<SquadResetPassword />} />
          <Route path="/squad-leader/dashboard" element={<SquadDashboard />} />
          {/* /squad-leader/admin merged into /admin */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/vietnam" element={<TripPage />} />
          <Route path="/cambodia" element={<TripPage />} />
          <Route path="/indonesia" element={<TripPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
