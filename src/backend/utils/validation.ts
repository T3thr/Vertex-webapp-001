// src/backend/utils/validation.ts
// ฟังก์ชันสำหรับตรวจสอบความถูกต้องของข้อมูล

/**
 * สร้าง slug จากข้อความ
 * @param text ข้อความที่ต้องการแปลงเป็น slug
 * @returns slug ที่สร้างจากข้อความ
 */
export const generateSlug = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ลบเครื่องหมายวรรณยุกต์
    .replace(/\s+/g, "-") // แทนที่ช่องว่างด้วยเครื่องหมายยัติภังค์
    .replace(/[^\w-]+/g, "") // ลบอักขระพิเศษ
    .replace(/\-\-+/g, "-") // แทนที่เครื่องหมายยัติภังค์ซ้ำด้วยเครื่องหมายเดียว
    .replace(/^-+/, "") // ลบเครื่องหมายยัติภังค์ที่อยู่ด้านหน้า
    .replace(/-+$/, ""); // ลบเครื่องหมายยัติภังค์ที่อยู่ด้านหลัง
};

/**
 * ตรวจสอบความถูกต้องของอีเมล
 * @param email อีเมลที่ต้องการตรวจสอบ
 * @returns ผลลัพธ์การตรวจสอบ
 */
export const validateEmail = (email: string): { valid: boolean; message?: string } => {
  if (!email || email.trim() === '') {
    return { valid: false, message: 'กรุณาระบุอีเมล' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  
  return { valid: true };
};

/**
 * ตรวจสอบความถูกต้องของอีเมล (แบบเก่า)
 * @param email อีเมลที่ต้องการตรวจสอบ
 * @returns true ถ้าอีเมลถูกต้อง, false ถ้าไม่ถูกต้อง
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * ตรวจสอบความถูกต้องของรหัสผ่าน
 * @param password รหัสผ่านที่ต้องการตรวจสอบ
 * @returns ผลลัพธ์การตรวจสอบ
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  // รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร
  if (password.length < 8) {
    return { valid: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' };
  }
  
  // ต้องมีตัวพิมพ์เล็ก
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว' };
  }
  
  // ต้องมีตัวพิมพ์ใหญ่
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว' };
  }
  
  // ต้องมีตัวเลข
  if (!/\d/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' };
  }
  
  return { valid: true };
};

/**
 * ตรวจสอบความถูกต้องของรหัสผ่าน (แบบเก่า)
 * @param password รหัสผ่านที่ต้องการตรวจสอบ
 * @returns true ถ้ารหัสผ่านถูกต้อง, false ถ้าไม่ถูกต้อง
 */
export const isValidPassword = (password: string): boolean => {
  // รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร
  // และมีอย่างน้อย 1 ตัวพิมพ์ใหญ่ 1 ตัวพิมพ์เล็ก และ 1 ตัวเลข
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * ตรวจสอบความถูกต้องของชื่อผู้ใช้
 * @param username ชื่อผู้ใช้ที่ต้องการตรวจสอบ
 * @returns ผลลัพธ์การตรวจสอบ
 */
export const validateUsername = (username: string): { valid: boolean; message?: string } => {
  // ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร
  if (username.length < 3) {
    return { valid: false, message: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' };
  }
  
  // ชื่อผู้ใช้ต้องไม่เกิน 20 ตัวอักษร
  if (username.length > 20) {
    return { valid: false, message: 'ชื่อผู้ใช้ต้องมีความยาวไม่เกิน 20 ตัวอักษร' };
  }
  
  // ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข ขีดล่าง หรือจุดเท่านั้น
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return { valid: false, message: 'ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร ตัวเลข ขีดล่าง หรือจุดเท่านั้น' };
  }
  
  return { valid: true };
};

/**
 * ตรวจสอบความถูกต้องของชื่อผู้ใช้ (แบบเก่า)
 * @param username ชื่อผู้ใช้ที่ต้องการตรวจสอบ
 * @returns true ถ้าชื่อผู้ใช้ถูกต้อง, false ถ้าไม่ถูกต้อง
 */
export const isValidUsername = (username: string): boolean => {
  // ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร
  // และประกอบด้วยตัวอักษร ตัวเลข ขีดล่าง หรือจุดเท่านั้น
  const usernameRegex = /^[a-zA-Z0-9._]{3,}$/;
  return usernameRegex.test(username);
};

/**
 * ตรวจสอบความถูกต้องของ URL
 * @param url URL ที่ต้องการตรวจสอบ
 * @returns true ถ้า URL ถูกต้อง, false ถ้าไม่ถูกต้อง
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * ตรวจสอบความถูกต้องของการยืนยันรหัสผ่าน
 * @param password รหัสผ่าน
 * @param confirmPassword รหัสผ่านยืนยัน
 * @returns ผลลัพธ์การตรวจสอบ
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): { valid: boolean; message?: string } => {
  if (!confirmPassword) {
    return { valid: false, message: 'กรุณายืนยันรหัสผ่าน' };
  }
  
  if (password !== confirmPassword) {
    return { valid: false, message: 'รหัสผ่านไม่ตรงกัน' };
  }
  
  return { valid: true };
};

/**
 * ตัดข้อความให้มีความยาวไม่เกินที่กำหนด
 * @param text ข้อความที่ต้องการตัด
 * @param maxLength ความยาวสูงสุดที่ต้องการ
 * @returns ข้อความที่ถูกตัดให้มีความยาวไม่เกินที่กำหนด
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

/**
 * แปลงข้อความเป็นรูปแบบ title case
 * @param text ข้อความที่ต้องการแปลง
 * @returns ข้อความในรูปแบบ title case
 */
export const toTitleCase = (text: string): string => {
  return text.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

/**
 * ลบ HTML tags จากข้อความ
 * @param html ข้อความ HTML ที่ต้องการลบ tags
 * @returns ข้อความที่ไม่มี HTML tags
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '');
};