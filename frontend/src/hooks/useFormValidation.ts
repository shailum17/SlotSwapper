import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface FormErrors {
  [field: string]: string;
}

export interface UseFormValidationReturn {
  errors: FormErrors;
  validateField: (field: string, value: any) => string | null;
  validateForm: (data: any) => boolean;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  setError: (field: string, error: string) => void;
  hasErrors: boolean;
}

export const useFormValidation = (rules: ValidationRules): UseFormValidationReturn => {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((field: string, value: any): string | null => {
    const rule = rules[field];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    // String-specific validations
    if (typeof value === 'string') {
      // Min length validation
      if (rule.minLength && value.length < rule.minLength) {
        return `${field} must be at least ${rule.minLength} characters`;
      }

      // Max length validation
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${field} must be no more than ${rule.maxLength} characters`;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return getPatternErrorMessage(field, rule.pattern);
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((data: any): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(rules).forEach((field) => {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setError = useCallback((field: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors,
    setError,
    hasErrors,
  };
};

// Helper function to get user-friendly pattern error messages
const getPatternErrorMessage = (field: string, pattern: RegExp): string => {
  const patternString = pattern.toString();
  
  // Email pattern
  if (patternString.includes('@') || patternString.includes('\\S+@\\S+\\.\\S+')) {
    return 'Please enter a valid email address';
  }
  
  // Password pattern (common patterns)
  if (patternString.includes('(?=.*[a-z])') || patternString.includes('(?=.*[A-Z])')) {
    return 'Password must contain uppercase and lowercase letters';
  }
  
  // Phone pattern
  if (patternString.includes('\\d') && (patternString.includes('\\(') || patternString.includes('-'))) {
    return 'Please enter a valid phone number';
  }
  
  // Default message
  return `${field} format is invalid`;
};

// Common validation rules
export const commonValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 6,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  title: {
    required: true,
    minLength: 1,
    maxLength: 100,
  },
};