import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import TripPage from "./pages/TripPage";
import BookingSuccess from "./pages/BookingSuccess";
import SquadHub from "./pages/SquadHub";
import SquadRegister from "./pages/SquadRegister";
import SquadDashboard from "./pages/SquadDashboard";
import SquadLogin from "./pages/SquadLogin";
import SquadAdmin from "./pages/SquadAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/squad-leader" element={<SquadHub />} />
          <Route path="/squad-leader/register" element={<SquadRegister />} />
          <Route path="/squad-leader/dashboard" element={<SquadDashboard />} />
          <Route path="/squad-leader/admin" element={<SquadAdmin />} />
          <Route path="/:slug" element={<TripPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
