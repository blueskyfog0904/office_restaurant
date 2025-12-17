import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Layout Components
import MainLayout from '../components/layout/MainLayout';

// Page Components
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import TermsConsentPage from '../pages/auth/TermsConsentPage';
import ProfileSetupPage from '../pages/auth/ProfileSetupPage';
import AuthCallbackPage from '../pages/auth/AuthCallbackPage';
import RestaurantDetailPage from '../pages/public/RestaurantDetailPage';
import RegionsPage from '../pages/public/RegionsPage';
import ProfilePage from '../pages/user/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';

// Board Pages
import BoardPage from '../pages/public/BoardPage';
import NoticeBoardPage from '../pages/public/board/NoticeBoardPage';
import FreeBoardPage from '../pages/public/board/FreeBoardPage';
import SuggestionBoardPage from '../pages/public/board/SuggestionBoardPage';
import WritePostPage from '../pages/public/board/WritePostPage';
import PostDetailPage from '../pages/public/board/PostDetailPage';
import RestaurantInfoBoardPage from '../pages/public/board/RestaurantInfoBoardPage';
import CivilServantBoardPage from '../pages/public/board/CivilServantBoardPage';
import HotBoardPage from '../pages/public/board/HotBoardPage';
import TermsPage from '../pages/public/TermsPage';
import PrivacyPage from '../pages/public/PrivacyPage';
import SupportPage from '../pages/public/SupportPage';

// Test Components
import KakaoMapTest from '../components/KakaoMapTest';

// Admin Pages
import AdminLoginPage from '../pages/admin/AdminLoginPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminRestaurants from '../pages/admin/AdminRestaurants';
import AdminEditRestaurantPage from '../pages/admin/AdminEditRestaurantPage';
import AdminReviews from '../pages/admin/AdminReviews';
import AdminPosts from '../pages/admin/AdminPosts';
import AdminSuggestions from '../pages/admin/AdminSuggestions';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminTerms from '../pages/admin/AdminTerms';
import AdminCommentReports from '../pages/admin/AdminCommentReports';
import AdminUserRoles from '../pages/admin/AdminUserRoles';
import AdminBoardsPage from '../pages/admin/AdminBoardsPage';
import AdminPostReportsPage from '../pages/admin/AdminPostReportsPage';
import AdminPointsPage from '../pages/admin/AdminPointsPage';
import AgencyManagementPage from '../pages/admin/AgencyManagementPage';
import VisitRecordsPage from '../pages/admin/VisitRecordsPage';
import DataUploadPage from '../pages/admin/DataUploadPage';

import StatisticsPage from '../pages/admin/StatisticsPage';
import SettingsPage from '../pages/admin/SettingsPage';
import DataQualityPage from '../pages/admin/DataQualityPage';
import RecommendationPage from '../pages/admin/RecommendationPage';
import RegionOrderPage from '../pages/admin/RegionOrderPage';

// Route Guards
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';

const AppRouter: React.FC = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          } />
          
          <Route path="/restaurants" element={
            <MainLayout>
              <RegionsPage />
            </MainLayout>
          } />
          
          <Route path="/restaurants/:subAdd1/:subAdd2/:title" element={
            <MainLayout>
              <RestaurantDetailPage />
            </MainLayout>
          } />
          
          {/* Fallback route for ID-based URLs */}
          <Route path="/restaurants/:id" element={
            <MainLayout>
              <RestaurantDetailPage />
            </MainLayout>
          } />

          {/* Board Routes */}
          <Route path="/board" element={
            <MainLayout>
              <BoardPage />
            </MainLayout>
          } />
          
          <Route path="/board/notice" element={
            <MainLayout>
              <NoticeBoardPage />
            </MainLayout>
          } />
          
          <Route path="/board/free" element={
            <MainLayout>
              <FreeBoardPage />
            </MainLayout>
          } />

          <Route path="/board/free/category/:categoryCode" element={
            <MainLayout>
              <FreeBoardPage />
            </MainLayout>
          } />

          <Route path="/board/free/hot" element={
            <MainLayout>
              <HotBoardPage />
            </MainLayout>
          } />

          <Route path="/board/restaurant-info" element={
            <MainLayout>
              <RestaurantInfoBoardPage />
            </MainLayout>
          } />

          <Route path="/board/restaurant-info/region/:categoryCode" element={
            <MainLayout>
              <RestaurantInfoBoardPage />
            </MainLayout>
          } />

          <Route path="/board/civil-servant" element={
            <MainLayout>
              <CivilServantBoardPage />
            </MainLayout>
          } />
          
          <Route path="/board/suggestion" element={
            <MainLayout>
              <SuggestionBoardPage />
            </MainLayout>
          } />

          {/* Board Write Routes */}
          <Route path="/board/free/write" element={
            <MainLayout>
              <WritePostPage />
            </MainLayout>
          } />
          
          <Route path="/board/suggestion/write" element={
            <MainLayout>
              <WritePostPage />
            </MainLayout>
          } />

          <Route path="/board/civil-servant/write" element={
            <MainLayout>
              <WritePostPage />
            </MainLayout>
          } />

          <Route path="/board/restaurant-info/write" element={
            <MainLayout>
              <WritePostPage />
            </MainLayout>
          } />

          {/* Board Detail Routes */}
          <Route path="/board/notice/:postId" element={
            <MainLayout>
              <PostDetailPage />
            </MainLayout>
          } />
          
          <Route path="/board/free/:postId" element={
            <MainLayout>
              <PostDetailPage />
            </MainLayout>
          } />
          
          <Route path="/board/suggestion/:postId" element={
            <MainLayout>
              <PostDetailPage />
            </MainLayout>
          } />

          <Route path="/board/restaurant-info/:postId" element={
            <MainLayout>
              <PostDetailPage />
            </MainLayout>
          } />

          <Route path="/board/civil-servant/:postId" element={
            <MainLayout>
              <PostDetailPage />
            </MainLayout>
          } />

          {/* Test Routes */}
          <Route path="/kakao-test" element={
            <MainLayout>
              <KakaoMapTest />
            </MainLayout>
          } />

          {/* Terms and Policy Routes */}
          <Route path="/terms" element={
            <MainLayout>
              <TermsPage />
            </MainLayout>
          } />
          
          <Route path="/privacy" element={
            <MainLayout>
              <PrivacyPage />
            </MainLayout>
          } />
          
          <Route path="/support" element={
            <MainLayout>
              <SupportPage />
            </MainLayout>
          } />

          {/* Auth Routes */}
          <Route path="/login" element={
            <MainLayout className="flex items-center justify-center py-12">
              <LoginPage />
            </MainLayout>
          } />
          
          {/* OAuth Callback Route */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          <Route path="/register" element={
            <MainLayout className="flex items-center justify-center py-12">
              <RegisterPage />
            </MainLayout>
          } />

          {/* Sign up flow */}
          <Route path="/register/terms" element={
            <MainLayout className="flex items-center justify-center py-12">
              <TermsConsentPage />
            </MainLayout>
          } />
          <Route path="/register/profile" element={
            <MainLayout className="flex items-center justify-center py-12">
              <ProfileSetupPage />
            </MainLayout>
          } />

          {/* Protected User Routes */}
          <Route path="/profile" element={
            <PrivateRoute>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </PrivateRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          <Route path="/admin/restaurants" element={
            <AdminRoute>
              <AdminRestaurants />
            </AdminRoute>
          } />
          
          <Route path="/admin/restaurants/edit/:id" element={
            <AdminRoute>
              <AdminEditRestaurantPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/reviews" element={
            <AdminRoute>
              <AdminReviews />
            </AdminRoute>
          } />

          <Route path="/admin/posts" element={
            <AdminRoute>
              <AdminPosts />
            </AdminRoute>
          } />

          <Route path="/admin/suggestions" element={
            <AdminRoute>
              <AdminSuggestions />
            </AdminRoute>
          } />

          <Route path="/admin/boards" element={
            <AdminRoute>
              <AdminBoardsPage />
            </AdminRoute>
          } />

          <Route path="/admin/post-reports" element={
            <AdminRoute>
              <AdminPostReportsPage />
            </AdminRoute>
          } />

          <Route path="/admin/points" element={
            <AdminRoute>
              <AdminPointsPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />

                    <Route path="/admin/terms" element={
            <AdminRoute>
              <AdminTerms />
            </AdminRoute>
          } />

          <Route path="/admin/comment-reports" element={
            <AdminRoute>
              <AdminCommentReports />
            </AdminRoute>
          } />

          <Route path="/admin/user-roles" element={
            <AdminRoute>
              <AdminUserRoles />
            </AdminRoute>
          } />

          <Route path="/admin/agencies" element={
            <AdminRoute>
              <AgencyManagementPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/visit-records" element={
            <AdminRoute>
              <VisitRecordsPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/data-upload" element={
            <AdminRoute>
              <DataUploadPage />
            </AdminRoute>
          } />
          

          
          <Route path="/admin/statistics" element={
            <AdminRoute>
              <StatisticsPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/settings" element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          } />
          
          <Route path="/admin/data-quality" element={
            <AdminRoute>
              <DataQualityPage />
            </AdminRoute>
          } />

          <Route path="/admin/recommendations" element={
            <AdminRoute>
              <RecommendationPage />
            </AdminRoute>
          } />

          <Route path="/admin/region-order" element={
            <AdminRoute>
              <RegionOrderPage />
            </AdminRoute>
          } />

          {/* Admin Catch-all - Redirect to login if not authenticated, dashboard if authenticated */}
          <Route path="/admin/*" element={
            <AdminRoute>
              <Navigate to="/admin/dashboard" replace />
            </AdminRoute>
          } />

          {/* 404 Page */}
          <Route path="*" element={
            <MainLayout>
              <NotFoundPage />
            </MainLayout>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default AppRouter; 