import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { useNotification } from '../contexts/NotificationContext';
import { useFormValidation, commonValidationRules } from '../hooks/useFormValidation';
import { formatError } from '../utils/errorHandling';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToSignup }) => {
  const { login, isLoading, user, token } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loginAttempted, setLoginAttempted] = useState(false);

  const validationRules = {
    email: commonValidationRules.email,
    password: { required: true }, // Less strict for login
  };

  const { errors, validateForm, validateField, clearError } = useFormValidation(validationRules);

  // Watch for successful authentication and call onSuccess
  useEffect(() => {
    if (loginAttempted && user && token && !isLoading) {
      showSuccess('Login Successful', 'Welcome back to SlotSwapper!');
      onSuccess?.();
      setLoginAttempted(false);
    }
  }, [user, token, isLoading, loginAttempted, onSuccess, showSuccess]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      clearError(name);
    }

    // Real-time validation for better UX
    if (value.trim()) {
      validateField(name, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(formData)) {
      showError('Validation Error', 'Please fix the errors below');
      return;
    }

    try {
      setLoginAttempted(true);
      await login(formData.email, formData.password);
      // Success handling is now done in useEffect
    } catch (error: any) {
      setLoginAttempted(false);
      const errorInfo = formatError(error);
      showError(errorInfo.title, errorInfo.message);
    }
  };

  return (
    <div className="login-form">
      <h2>Login to SlotSwapper</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
            disabled={isLoading}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" className="error-message" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={errors.password ? 'error' : ''}
            disabled={isLoading}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <span id="password-error" className="error-message" role="alert">
              {errors.password}
            </span>
          )}
        </div>

        <button type="submit" disabled={isLoading} className="submit-button">
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="form-footer">
        <p>
          Don't have an account?{' '}
          <button 
            type="button" 
            onClick={onSwitchToSignup}
            className="link-button"
            disabled={isLoading}
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;