// backend/services/sendemail.ts
import nodemailer from 'nodemailer';
import crypto from 'crypto'; // Use crypto for token generation

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

// Configure the transporter (ensure EMAIL_USERNAME and EMAIL_PASSWORD are set in .env)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME as string,
    pass: process.env.EMAIL_PASSWORD as string,
  },
});

// Function to generate a secure random token (used in signup and resend)
export const generateVerificationToken = (): { token: string; expiry: Date } => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 3600000); // Token expires in 1 hour
  return { token, expiry };
};

// Function to send the verification email
export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  if (!process.env.NEXTAUTH_URL) { // Use NEXTAUTH_URL for base URL consistency
    console.error('❌ Missing NEXTAUTH_URL in environment variables for verification email.');
    throw new Error('Server configuration error: Missing base URL.');
  }
  if (!process.env.EMAIL_USERNAME) {
      console.error('❌ Missing EMAIL_USERNAME in environment variables.');
      throw new Error('Server configuration error: Missing sender email.');
  }

  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions: MailOptions = {
    from: `"NOVELMAZE - GAME VISUAL NOVEL PLATFORM" <${process.env.EMAIL_USERNAME}>`,
    to: email,
    subject: '🔹 Verify Your Email to Get Started!',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0e0e10; color: #ffffff; border-radius: 8px;">
        <div style="text-align: center;">
          <img src="https://novelmaze.vercel.app/logo.png" alt="Brand Logo" style="width: 120px; margin-bottom: 20px;" />
          <h2 style="color: #ff5b00;">Welcome to Our Platform! 🎉</h2>
          <p style="color: #c0c0c0;">You're just one step away from unlocking exclusive content, special perks, and an immersive experience.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #ff5b00; color: white; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px;">
            ✅ Verify My Email
          </a>
        </div>

        <p style="text-align: center; font-size: 14px; color: #c0c0c0;">
          If the button above doesn’t work, copy and paste this link into your browser:
        </p>
        <p style="word-break: break-all; text-align: center; color: #ff5b00; font-size: 14px;">${verificationUrl}</p>

        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />

        <div style="text-align: center;">
          <p style="font-size: 12px; color: #888;">Stay connected with us:</p>
          <p>
            <a href="#" style="margin: 0 8px; text-decoration: none; color: #ff5b00;">Facebook</a> |
            <a href="#" style="margin: 0 8px; text-decoration: none; color: #ff5b00;">Twitter</a> |
            <a href="#" style="margin: 0 8px; text-decoration: none; color: #ff5b00;">Instagram</a>
          </p>
        </div>

        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          &copy; ${new Date().getFullYear()} Pathy. All Rights Reserved.
        </p>
      </div>
    `,
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Verification email sent to ${email}`);
  } catch (error) {
      console.error(`❌ Failed to send verification email to ${email}:`, error);
      // Re-throw the error so the calling function knows sending failed
      throw new Error("Failed to send verification email.");
  }
};

