import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { useNotification } from '../contexts/NotificationContext';
import { useFormValidation, commonValidationRules } from '../hooks/useFormValidation';
import { formatError } from '../utils/errorHandling';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { signup, isLoading, user, token } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signupAttempted, setSignupAttempted] = useState(false);

  const validationRules = {
    name: commonValidationRules.name,
    email: commonValidationRules.email,
    password: commonValidationRules.password,
    confirmPassword: {
      required: true,
      custom: (value: string) => {
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return null;
      },
    },
  };

  const { errors, validateForm, validateField, clearError } = useFormValidation(validationRules);

  // Watch for successful authentication and call onSuccess
  useEffect(() => {
    if (signupAttempted && user && token && !isLoading) {
      showSuccess('Account Created', 'Welcome to SlotSwapper! You are now logged in.');
      onSuccess?.();
      setSignupAttempted(false);
    }
  }, [user, token, isLoading, signupAttempted, onSuccess, showSuccess]);

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
      setSignupAttempted(true);
      await signup(formData.name.trim(), formData.email, formData.password);
      // Success handling is now done in useEffect
    } catch (error: any) {
      setSignupAttempted(false);
      const errorInfo = formatError(error);
      showError(errorInfo.title, errorInfo.message);
    }
  };

  return (
    <div className="signup-form">
      <h2>Sign Up for SlotSwapper</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'error' : ''}
            disabled={isLoading}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <span id="name-error" className="error-message" role="alert">
              {errors.name}
            </span>
          )}
        </div>

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

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={errors.confirmPassword ? 'error' : ''}
            disabled={isLoading}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {errors.confirmPassword && (
            <span id="confirmPassword-error" className="error-message" role="alert">
              {errors.confirmPassword}
            </span>
          )}
        </div>

        <button type="submit" disabled={isLoading} className="submit-button">
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="form-footer">
        <p>
          Already have an account?{' '}
          <button 
            type="button" 
            onClick={onSwitchToLogin}
            className="link-button"
            disabled={isLoading}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;