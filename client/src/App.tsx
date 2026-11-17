import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public Layout & Pages
import Navbar from './public/components/Navbar';
import Footer from './public/components/Footer';
import HomePage from './public/pages/HomePage';
import AboutPage from './public/pages/AboutPage';
import ProductsPage from './public/pages/ProductsPage';
import ProductDetailPage from './public/pages/ProductDetailPage';
import GalleryPage from './public/pages/GalleryPage';
import ContactPage from './public/pages/ContactPage';
import LoginPage from './public/pages/LoginPage';
import NotFoundPage from './public/pages/NotFoundPage';

// Private App Layout & Pages
import AppHeader from './app/components/AppHeader';
import BottomNav from './app/components/BottomNav';
import Sidebar from './app/components/Sidebar';
import DashboardPage from './app/pages/DashboardPage';
import StockPage from './app/pages/StockPage';
import AddHubPage from './app/pages/AddHubPage';
import MoreHubPage from './app/pages/MoreHubPage';
import TracePage from './app/pages/TracePage';
import SalesPage from './app/pages/SalesPage';

// Wizards
import SowingWizard from './app/pages/wizards/SowingWizard';
import ScionWizard from './app/pages/wizards/ScionWizard';
import GraftingWizard from './app/pages/wizards/GraftingWizard';
import MortalityWizard from './app/pages/wizards/MortalityWizard';
import PromoteWizard from './app/pages/wizards/PromoteWizard';
import SaleWizard from './app/pages/wizards/SaleWizard';

// Admin CMS Pages
import CmsSectionsPage from './app/pages/cms/CmsSectionsPage';
import CmsProductsPage from './app/pages/cms/CmsProductsPage';
import CmsBannersPage from './app/pages/cms/CmsBannersPage';
import CmsEnquiriesPage from './app/pages/cms/CmsEnquiriesPage';
import CmsSettingsPage from './app/pages/cms/CmsSettingsPage';
import AuditLogsPage from './app/pages/cms/AuditLogsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

// Layout for Public Site
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-earth-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

// Layout for Private Mobile-First Operations App
const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* PUBLIC WEBSITE ROUTES */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          }
        />
        <Route
          path="/about"
          element={
            <PublicLayout>
              <AboutPage />
            </PublicLayout>
          }
        />
        <Route
          path="/products"
          element={
            <PublicLayout>
              <ProductsPage />
            </PublicLayout>
          }
        />
        <Route
          path="/products/:slug"
          element={
            <PublicLayout>
              <ProductDetailPage />
            </PublicLayout>
          }
        />
        <Route
          path="/gallery"
          element={
            <PublicLayout>
              <GalleryPage />
            </PublicLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <PublicLayout>
              <ContactPage />
            </PublicLayout>
          }
        />
        <Route
          path="/login"
          element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          }
        />

        {/* PRIVATE APP ROUTES (MOBILE-FIRST) */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <DashboardPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/stock"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <StockPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/add"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <AddHubPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/more"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <MoreHubPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/trace"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <TracePage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/sales"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <PrivateLayout>
                <SalesPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />

        {/* DATA ENTRY WIZARDS */}
        <Route
          path="/app/wizard/sowing"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <SowingWizard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/wizard/scion"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <ScionWizard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/wizard/grafting"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <GraftingWizard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/wizard/mortality"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <MortalityWizard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/wizard/promote"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <PromoteWizard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/wizard/sale"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}>
              <PrivateLayout>
                <SaleWizard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />

        {/* ADMIN CMS ROUTES */}
        <Route
          path="/app/cms/sections"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PrivateLayout>
                <CmsSectionsPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/cms/products"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PrivateLayout>
                <CmsProductsPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/cms/banners"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PrivateLayout>
                <CmsBannersPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/cms/enquiries"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PrivateLayout>
                <CmsEnquiriesPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/cms/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PrivateLayout>
                <CmsSettingsPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/cms/audit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <PrivateLayout>
                <AuditLogsPage />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 FALLBACK */}
        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFoundPage />
            </PublicLayout>
          }
        />
      </Routes>
    </AuthProvider>
  );
};

export default App;

