import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, EventProvider, SwapProvider, StateManagerProvider } from './contexts';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthPage, Dashboard, ProtectedRoute, ErrorBoundary, NotificationContainer } from './components';
import './App.css';
import './styles/loading.css';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <EventProvider>
            <SwapProvider>
              <StateManagerProvider>
                <Router>
                  <div className="App">
                    <Routes>
                      {/* Public route for authentication */}
                      <Route path="/auth" element={<AuthPage />} />
                      
                      {/* Protected routes */}
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Default redirect to dashboard */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      
                      {/* Catch all route - redirect to dashboard */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                    <NotificationContainer />
                  </div>
                </Router>
              </StateManagerProvider>
            </SwapProvider>
          </EventProvider>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;