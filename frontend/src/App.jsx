// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import useAuthStore from './store/authStore';
import AuthPage from './components/auth/AuthPage';
import AppLayout from './components/shared/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import EventsPage from './components/events/EventsPage';
import EventDetail from './components/events/EventDetail';
import DocumentsPage from './components/documents/DocumentsPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import ChatbotPage from './components/chatbot/ChatbotPage';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// Protected route wrapper
const Protected = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '13px' },
            success: { iconTheme: { primary: '#6C63FF', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <AppLayout />
              </Protected>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="chat" element={<ChatbotPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
