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
    return { valid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อยหนึ่งตัว' };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อยหนึ่งตัว' };
  }
  
  return { valid: true };
};

export const validateUsername = (username: string): { valid: boolean; message?: string } => {
  if (username.length < 3) {
    return { valid: false, message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' };
  }
  
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { 
      valid: false, 
      message: 'ชื่อผู้ใช้สามารถใช้ได้เฉพาะตัวอักษร, ตัวเลข และเครื่องหมายขีดล่างเท่านั้น' 
    };
  }
  
  return { valid: true };
};

export const validateConfirmPassword = (password: string, confirmPassword: string): { valid: boolean; message?: string } => {
  if (!confirmPassword.trim()) {
    return { valid: false, message: 'กรุณายืนยันรหัสผ่าน' };
  }
  
  if (password !== confirmPassword) {
    return { valid: false, message: 'รหัสผ่านไม่ตรงกัน' };
  }
  
  return { valid: true };
};