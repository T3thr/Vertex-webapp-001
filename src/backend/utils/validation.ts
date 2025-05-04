// src/backend/utils/validation.ts
/**
 * Form validation utility functions
 */

export const validateEmail = (email: string): boolean => {
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  };
  
  export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    
    // Check for at least one number
    if (!/\d/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    return { valid: true };
  };
  
  export const validateUsername = (username: string): { valid: boolean; message?: string } => {
    if (username.length < 3) {
      return { valid: false, message: 'Username must be at least 3 characters' };
    }
    
    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { 
        valid: false, 
        message: 'Username can only contain letters, numbers, and underscores' 
      };
    }
    
    return { valid: true };
  };