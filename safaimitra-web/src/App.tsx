import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import SubmitFeedback from './pages/public/SubmitFeedback';
import DashboardLayout from './components/layout/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import Locations from './pages/dashboard/Locations';
import Cleaners from './pages/dashboard/Cleaners';
import Feedback from './pages/dashboard/Feedback';
import CleanerLayout from './pages/cleaner/CleanerLayout';
import Assignments from './pages/cleaner/Assignments';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/submit-feedback" element={<SubmitFeedback />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Overview />} />
            <Route path="locations" element={<Locations />} />
            <Route path="cleaners" element={<Cleaners />} />
            <Route path="feedback" element={<Feedback />} />
          </Route>

          {/* Cleaner App Routes */}
          <Route path="/cleaner" element={
            <ProtectedRoute allowedRoles={['cleaner']}>
              <CleanerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Assignments />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
