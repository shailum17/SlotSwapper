import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  overlay?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  overlay = false,
  message,
}) => {
  const spinnerContent = (
    <div className={`loading-spinner-container ${overlay ? 'loading-overlay' : ''}`}>
      <div className={`loading-spinner loading-spinner-${size} loading-spinner-${color}`}>
        <div className="spinner"></div>
      </div>
      {message && <div className="loading-message">{message}</div>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay-backdrop">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;