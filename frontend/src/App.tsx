import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AgentWorkspacePage } from './pages/AgentWorkspacePage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { CallsPage } from './pages/CallsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { QAPortalPage } from './pages/QAPortalPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-mono text-xs">
        Loading Session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Root index redirect based on role
const RootRedirect: React.FC = () => {
  const { user, token, loading } = useAuth();
  if (loading) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'AGENT') return <Navigate to="/agent-workspace" replace />;
  if (user.role === 'QA_AUDITOR') return <Navigate to="/qa-portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected SaaS Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RootRedirect />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="agent-workspace" element={<AgentWorkspacePage />} />
                <Route path="live-monitor" element={<LiveMonitorPage />} />
                <Route path="calls" element={<CallsPage />} />
                <Route
                  path="qa-portal"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'QA_AUDITOR']}>
                      <QAPortalPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Catch All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
