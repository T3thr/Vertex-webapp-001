import * as dotenv from 'dotenv';
dotenv.config();
import dbConnect from '../backend/lib/mongodb';
import UserModel from '../backend/models/User';
import { generateVerificationToken, sendVerificationEmail } from '../backend/services/sendemail';

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) throw new Error('กรุณาระบุอีเมล เช่น: npm run verify:send user@example.com');

  await dbConnect();

  // Find user as full document (not lean) to enable saving
  const user = await UserModel.findOne({ email: emailArg.toLowerCase() });
  if (!user) throw new Error('ไม่พบผู้ใช้');

  console.log(`🔄 สร้างโทเค็นใหม่สำหรับ ${user.email}...`);
  
  // Use the same token generation logic as resend-verification API
  const { token: plainToken, hashedToken, expiry } = generateVerificationToken();

  // Update token in User model (same as API)
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = expiry;
  await user.save();
  
  console.log(`✅ อัปเดตโทเค็นสำเร็จสำหรับ ${user.email}`);

  await sendVerificationEmail(user.email!, plainToken);
  console.log('📧 ส่งอีเมลยืนยันเรียบร้อย');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });