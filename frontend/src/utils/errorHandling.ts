// Error handling utilities for API responses

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface FormValidationError {
  field: string;
  message: string;
}

// Extract user-friendly error message from API response
export const extractErrorMessage = (error: any): string => {
  // Handle axios errors
  if (error.response) {
    // Server responded with error status
    const apiError = error.response.data?.error;
    if (apiError?.message) {
      return apiError.message;
    }
    
    // Fallback to status text
    return error.response.statusText || 'An error occurred';
  }
  
  // Handle network errors
  if (error.request) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Handle other errors
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

// Extract validation errors from API response
export const extractValidationErrors = (error: any): FormValidationError[] => {
  const validationErrors: FormValidationError[] = [];
  
  if (error.response?.data?.error?.details?.validationErrors) {
    const errors = error.response.data.error.details.validationErrors;
    
    // Handle different validation error formats
    if (Array.isArray(errors)) {
      errors.forEach((err: any) => {
        if (err.field && err.message) {
          validationErrors.push({
            field: err.field,
            message: err.message,
          });
        }
      });
    } else if (typeof errors === 'object') {
      Object.keys(errors).forEach((field) => {
        validationErrors.push({
          field,
          message: errors[field],
        });
      });
    }
  }
  
  return validationErrors;
};

// Check if error is a network error
export const isNetworkError = (error: any): boolean => {
  return error.request && !error.response;
};

// Check if error is an authentication error
export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401;
};

// Check if error is a validation error
export const isValidationError = (error: any): boolean => {
  return error.response?.status === 400 && 
         error.response?.data?.error?.code === 'VALIDATION_ERROR';
};

// Check if error is a server error
export const isServerError = (error: any): boolean => {
  return error.response?.status >= 500;
};

// Get user-friendly error title based on error type
export const getErrorTitle = (error: any): string => {
  if (isNetworkError(error)) {
    return 'Connection Error';
  }
  
  if (isAuthError(error)) {
    return 'Authentication Error';
  }
  
  if (isValidationError(error)) {
    return 'Validation Error';
  }
  
  if (isServerError(error)) {
    return 'Server Error';
  }
  
  return 'Error';
};

// Format error for display
export const formatError = (error: any): { title: string; message: string; type: string } => {
  return {
    title: getErrorTitle(error),
    message: extractErrorMessage(error),
    type: getErrorType(error),
  };
};

// Get error type for styling/handling
export const getErrorType = (error: any): string => {
  if (isNetworkError(error)) return 'network';
  if (isAuthError(error)) return 'auth';
  if (isValidationError(error)) return 'validation';
  if (isServerError(error)) return 'server';
  return 'general';
};

// Retry logic for failed requests
export const shouldRetry = (error: any, retryCount: number = 0): boolean => {
  const maxRetries = 3;
  
  // Don't retry if we've exceeded max attempts
  if (retryCount >= maxRetries) return false;
  
  // Don't retry client errors (4xx)
  if (error.response?.status >= 400 && error.response?.status < 500) {
    return false;
  }
  
  // Retry network errors and server errors
  return isNetworkError(error) || isServerError(error);
};

// Delay function for retry logic
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Exponential backoff calculation
export const getRetryDelay = (retryCount: number): number => {
  return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
};