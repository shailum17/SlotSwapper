import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import './AuthPage.css';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { user, token, isLoading } = useAuth();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (user && token && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, isLoading, navigate]);

  const handleAuthSuccess = () => {
    // This will be handled by the useEffect above
    // navigate('/dashboard');
  };

  const switchToSignup = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>SlotSwapper</h1>
          <p>Peer-to-peer time slot scheduling</p>
        </div>
        
        <div className="auth-form-container">
          {isLogin ? (
            <LoginForm 
              onSuccess={handleAuthSuccess}
              onSwitchToSignup={switchToSignup}
            />
          ) : (
            <SignupForm 
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={switchToLogin}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;