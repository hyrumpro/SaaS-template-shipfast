// lib/validation.ts
// Form validation utilities

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  message?: string;
};

export type ValidationRules = {
  [key: string]: ValidationRule;
};

export type ValidationErrors = {
  [key: string]: string;
};

// Common validation patterns
export const Patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  phone: /^\+?[\d\s-()]+$/,
  url: /^https?:\/\/.+/,
};

// Validation functions
export const Validators = {
  email: (value: string): boolean => Patterns.email.test(value),

  password: (value: string): boolean => {
    // At least 8 characters, one uppercase, one lowercase, one number
    return Patterns.password.test(value);
  },

  minLength: (value: string, min: number): boolean => value.length >= min,

  maxLength: (value: string, max: number): boolean => value.length <= max,

  required: (value: string): boolean => value.trim().length > 0,

  phone: (value: string): boolean => Patterns.phone.test(value),

  url: (value: string): boolean => Patterns.url.test(value),
};

// Error messages
export const ErrorMessages = {
  required: (field: string) => `${field} is required`,
  email: "Please enter a valid email address",
  password:
    "Password must be at least 8 characters with uppercase, lowercase, and number",
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must be no more than ${max} characters`,
  phone: "Please enter a valid phone number",
  url: "Please enter a valid URL",
  match: (field1: string, field2: string) => `${field1} and ${field2} must match`,
};

// Validate a single field
export function validateField(
  value: string,
  rules: ValidationRule,
  fieldName: string = "Field"
): string | null {
  if (rules.required && !Validators.required(value)) {
    return rules.message || ErrorMessages.required(fieldName);
  }

  if (value && rules.minLength && !Validators.minLength(value, rules.minLength)) {
    return rules.message || ErrorMessages.minLength(fieldName, rules.minLength);
  }

  if (value && rules.maxLength && !Validators.maxLength(value, rules.maxLength)) {
    return rules.message || ErrorMessages.maxLength(fieldName, rules.maxLength);
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    return rules.message || `Invalid ${fieldName.toLowerCase()} format`;
  }

  if (value && rules.custom && !rules.custom(value)) {
    return rules.message || `Invalid ${fieldName.toLowerCase()}`;
  }

  return null;
}

// Validate entire form
export function validateForm(
  data: Record<string, string>,
  rules: ValidationRules
): ValidationErrors {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const error = validateField(data[field] || "", rules[field], field);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
}

// Check if form has errors
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Pre-defined validation rule sets
export const CommonRules = {
  email: {
    required: true,
    pattern: Patterns.email,
    message: ErrorMessages.email,
  },
  password: {
    required: true,
    minLength: 8,
    pattern: Patterns.password,
    message: ErrorMessages.password,
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  phone: {
    pattern: Patterns.phone,
    message: ErrorMessages.phone,
  },
};
