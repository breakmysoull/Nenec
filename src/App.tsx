import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// App Pages
import Dashboard from "./pages/Dashboard";
import Stock from "./pages/Stock";
import Purchases from "./pages/purchases/PurchasesList";
import PurchaseDetail from "./pages/purchases/PurchaseDetail";
import Checklists from "./pages/Checklists";
import ChecklistReview from "./pages/ChecklistReview";
import Training from "./pages/Training";
import Products from "./pages/Products";
import Units from "./pages/Units";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredPermission="view_dashboard">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock"
              element={
                <ProtectedRoute requiredPermission="view_stock">
                  <Stock />
                </ProtectedRoute>
              }
            />
            {/* Purchases Module */}
            <Route
              path="/purchases"
              element={
                <ProtectedRoute requiredPermission="view_orders">
                  <Purchases />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchases/:id"
              element={
                <ProtectedRoute requiredPermission="view_orders">
                  <PurchaseDetail />
                </ProtectedRoute>
              }
            />
            {/* Legacy Orders Route - Redirect or Keep for compatibility if needed */}
            <Route
              path="/orders"
              element={<Navigate to="/purchases" replace />}
            />

            <Route
              path="/checklists"
              element={
                <ProtectedRoute requiredPermission="view_checklists">
                  <Checklists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checklists/review"
              element={
                <ProtectedRoute requiredPermission="view_checklist_review">
                  <ChecklistReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute requiredPermission="view_training">
                  <Training />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute requiredPermission="view_products">
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/units"
              element={
                <ProtectedRoute requiredPermission="view_units">
                  <Units />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission="view_users">
                  <Users />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
