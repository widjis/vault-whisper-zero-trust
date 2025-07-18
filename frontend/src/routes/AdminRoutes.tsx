import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../components/admin/AdminLayout';
import Dashboard from '../components/admin/Dashboard';
import UserManagement from '../components/admin/UserManagement';
import AuditLogViewer from '../components/admin/AuditLogViewer';
import NotFound from '../components/common/NotFound';

// Admin role guard component
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading or redirect if not authenticated or not admin
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AdminRoutes: React.FC = () => {
  return (
    <AdminGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="audit-logs" element={<AuditLogViewer />} />
          <Route path="security" element={<div>Security Settings (Coming Soon)</div>} />
          <Route path="settings" element={<div>Admin Settings (Coming Soon)</div>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AdminGuard>
  );
};

export default AdminRoutes;