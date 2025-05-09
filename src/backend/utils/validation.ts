// src/backend/utils/validation.ts
// src/backend/utils/validation.ts


/**
 * ตรวจสอบการยืนยันรหัสผ่าน
 * เปรียบเทียบรหัสผ่านและการยืนยันรหัสผ่านว่าตรงกันหรือไม่
 * @returns ผลการตรวจสอบพร้อมข้อความอธิบาย
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): { valid: boolean; message?: string } => {
  const sanitizedPassword = sanitizeInput(password);
  const sanitizedConfirmPassword = sanitizeInput(confirmPassword);
  
  if (!sanitizedConfirmPassword.trim()) {
    return { valid: false, message: 'กรุณายืนยันรหัสผ่าน' };
  }
  
  if (sanitizedPassword !== sanitizedConfirmPassword) {
    return { valid: false, message: 'รหัสผ่านไม่ตรงกัน' };
  }
  
  return { valid: true };
};// src/backend/utils/validation.ts
/**
 * Form validation utility functions - ฟังก์ชันตรวจสอบความถูกต้องของฟอร์ม
 */

/**
 * สะอาดข้อมูลที่รับเข้ามาเพื่อป้องกันการโจมตี
 * ทำความสะอาดอินพุตโดยการตัดช่องว่างและกรองอักขระพิเศษที่อาจใช้ในการโจมตี XSS
 */
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  // ตัดช่องว่างและกรองแท็ก HTML ทั่วไปที่อาจใช้ในการโจมตี
  return input.trim().replace(/[<>{}]/g, '');
};

/**
 * ตรวจสอบความถูกต้องของอีเมล
 * ใช้การตรวจสอบอีเมลแบบมาตรฐานตามมาตรฐาน RFC 5322
 */
export const validateEmail = (email: string): boolean => {
  const sanitizedEmail = sanitizeInput(email);
  if (!sanitizedEmail) {
    return false;
  }
  
  // ตรวจสอบความยาวอีเมล (ตามมาตรฐาน)
  if (sanitizedEmail.length > 254) {
    return false;
  }
  
  // รูปแบบอีเมลที่ถูกต้องตามมาตรฐาน RFC 5322
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailPattern.test(sanitizedEmail);
};

/**
 * ตรวจสอบความถูกต้องของรหัสผ่าน
 * วิเคราะห์รหัสผ่านตามเกณฑ์ความปลอดภัยมาตรฐาน
 * @returns ผลการตรวจสอบ พร้อมข้อความอธิบายและรายละเอียดการตรวจสอบแต่ละเกณฑ์
 */
export const validatePassword = (password: string): { valid: boolean; message?: string; checks?: Record<string, boolean> } => {
  const sanitizedPassword = sanitizeInput(password);
  
  // ตรวจสอบเงื่อนไขต่างๆของรหัสผ่าน
  const checks = {
    length: sanitizedPassword.length >= 8 && sanitizedPassword.length <= 128,
    hasDigit: /\d/.test(sanitizedPassword),
    hasUppercase: /[A-Z]/.test(sanitizedPassword),
    hasLowercase: /[a-z]/.test(sanitizedPassword),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(sanitizedPassword)
  };

  // ตรวจสอบความยาว
  if (!checks.length) {
    if (sanitizedPassword.length < 8) {
      return { 
        valid: false, 
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
        checks
      };
    }
    
    if (sanitizedPassword.length > 128) {
      return { 
        valid: false, 
        message: 'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร',
        checks
      };
    }
  }
  
  // ตรวจสอบว่ามีตัวเลขอย่างน้อยหนึ่งตัว
  if (!checks.hasDigit) {
    return { 
      valid: false, 
      message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อยหนึ่งตัว',
      checks
    };
  }
  
  // ตรวจสอบว่ามีตัวพิมพ์ใหญ่อย่างน้อยหนึ่งตัว
  if (!checks.hasUppercase) {
    return { 
      valid: false, 
      message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อยหนึ่งตัว',
      checks
    };
  }
  
  // ตรวจสอบว่ามีตัวพิมพ์เล็กอย่างน้อยหนึ่งตัว
  if (!checks.hasLowercase) {
    return { 
      valid: false, 
      message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อยหนึ่งตัว',
      checks
    };
  }
  
  return { valid: true, checks };
};

/**
 * ตรวจสอบความถูกต้องของชื่อผู้ใช้
 * ตรวจสอบชื่อผู้ใช้ตามเกณฑ์ความปลอดภัยและความเหมาะสม
 * @returns ผลการตรวจสอบ พร้อมข้อความอธิบายและรายละเอียดการตรวจสอบแต่ละเกณฑ์
 */
export const validateUsername = (username: string): { valid: boolean; message?: string; checks?: Record<string, boolean> } => {
  const sanitizedUsername = sanitizeInput(username);
  
  // ตรวจสอบเงื่อนไขต่างๆของชื่อผู้ใช้
  const checks = {
    length: sanitizedUsername.length >= 3 && sanitizedUsername.length <= 20,
    validChars: /^[a-zA-Z0-9_]+$/.test(sanitizedUsername),
    notReserved: true,
    noConsecutiveUnderscores: !/__{2,}/.test(sanitizedUsername)
  };
  
  // ตรวจสอบความยาว
  if (!checks.length) {
    if (sanitizedUsername.length < 3) {
      return { 
        valid: false, 
        message: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร',
        checks
      };
    }
    
    if (sanitizedUsername.length > 20) {
      return { 
        valid: false, 
        message: 'ชื่อผู้ใช้ต้องไม่เกิน 20 ตัวอักษร',
        checks
      };
    }
  }
  
  // อนุญาตเฉพาะตัวอักษร ตัวเลข และเครื่องหมายขีดล่าง
  if (!checks.validChars) {
    return { 
      valid: false, 
      message: 'ชื่อผู้ใช้สามารถใช้ได้เฉพาะตัวอักษร, ตัวเลข และเครื่องหมายขีดล่างเท่านั้น',
      checks
    };
  }
  
  // ตรวจสอบไม่ให้มีขีดล่างติดกันมากกว่าหนึ่งตัว
  if (!checks.noConsecutiveUnderscores) {
    return {
      valid: false,
      message: 'ชื่อผู้ใช้ต้องไม่มีเครื่องหมายขีดล่างติดกันมากกว่าหนึ่งตัว',
      checks
    };
  }
  
  // ตรวจสอบชื่อที่สงวนไว้
  const reservedUsernames = [
    'admin', 'administrator',
  ];
  
  checks.notReserved = !reservedUsernames.includes(sanitizedUsername.toLowerCase());
  
  if (!checks.notReserved) {
    return { 
      valid: false, 
      message: 'ชื่อผู้ใช้นี้ถูกสงวนไว้ กรุณาเลือกชื่ออื่น',
      checks
    };
  }
  
  return { valid: true, checks };

};