// src/backend/services/sendemail.ts
import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME as string,
    pass: process.env.EMAIL_PASSWORD as string,
  },
});

// Function to generate a secure random token and its hashed version
// คืนค่า plain token สำหรับอีเมล, hashed token สำหรับ DB, และวันหมดอายุ
export const generateVerificationToken = (): { token: string; hashedToken: string; expiry: Date } => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex"); // Hash a copy
  const expiry = new Date(Date.now() + 3600000 * 24); // Token expires in 24 hours (ปรับตามต้องการ)
  console.log(`🔑 [TokenUtil] Generated plain token (for email): ${token.substring(0,10)}... , hashed token (for DB): ${hashedToken.substring(0,10)}...`);
  return { token, hashedToken, expiry };
};


export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  if (!process.env.NEXTAUTH_URL) {
    console.error('❌ Missing NEXTAUTH_URL in environment variables for verification email.');
    throw new Error('Server configuration error: Missing base URL.');
  }
  if (!process.env.EMAIL_USERNAME) {
      console.error('❌ Missing EMAIL_USERNAME in environment variables.');
      throw new Error('Server configuration error: Missing sender email.');
  }

  // token ที่รับเข้ามาในฟังก์ชันนี้คือ token
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions: MailOptions = {
    from: `"NOVELMAZE - GAME VISUAL NOVEL PLATFORM" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: '🔹 ยืนยันอีเมลของคุณเพื่อเริ่มต้นใช้งาน!', // แปลเป็นไทย
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0e0e10; color: #ffffff; border-radius: 8px;">
        <div style="text-align: center;">
          <img src="https://novelmaze.vercel.app/logo.png" alt="Brand Logo" style="width: 120px; margin-bottom: 20px;" />
          <h2 style="color: #ff5b00;">ยินดีต้อนรับสู่แพลตฟอร์มของเรา! 🎉</h2>
          <p style="color: #c0c0c0;">อีกเพียงขั้นตอนเดียวคุณก็จะสามารถเข้าถึงเนื้อหาพิเศษ, สิทธิประโยชน์, และประสบการณ์ที่น่าประทับใจ</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #ff5b00; color: white; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">
            ✅ ยืนยันอีเมลของฉัน
          </a>
        </div>

        <p style="text-align: center; font-size: 14px; color: #c0c0c0;">
          หากปุ่มด้านบนไม่ทำงาน, คัดลอกและวางลิงก์นี้ในเบราว์เซอร์ของคุณ:
        </p>
        <p style="word-break: break-all; text-align: center; color: #ff5b00; font-size: 14px;">${verificationUrl}</p>

        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />

        <div style="text-align: center;">
          <p style="font-size: 12px; color: #888;">เชื่อมต่อกับเรา:</p>
          <p>
            <a href="#" style="margin: 0 8px; text-decoration: none; color: #ff5b00;">Facebook</a> |
            <a href="#" style="margin: 0 8px; text-decoration: none; color: #ff5b00;">Twitter</a> |
            <a href="#" style="margin: 0 8px; text-decoration: none; color: #ff5b00;">Instagram</a>
          </p>
        </div>

        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          &copy; ${new Date().getFullYear()} Pathy. สงวนลิขสิทธิ์.
        </p>
      </div>
    `,
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 อีเมลยืนยันถูกส่งไปยัง ${email}`);
  } catch (error) {
      console.error(`❌ ไม่สามารถส่งอีเมลยืนยันไปยัง ${email}:`, error);
      throw new Error("ไม่สามารถส่งอีเมลยืนยันได้");
  }
};