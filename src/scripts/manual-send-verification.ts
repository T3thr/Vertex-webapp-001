import * as dotenv from 'dotenv';
dotenv.config();
import dbConnect from '../backend/lib/mongodb';
import UserSecurityModel from '../backend/models/UserSecurity';
import UserModel from '../backend/models/User';
import { generateVerificationToken, sendVerificationEmail } from '../backend/services/sendemail';

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) throw new Error('กรุณาระบุอีเมล เช่น: npm run verify:send user@example.com');

  await dbConnect();

  const user = await UserModel.findOne({ email: emailArg }).lean();
  if (!user) throw new Error('ไม่พบผู้ใช้');

  const { token, hashedToken, expiry } = generateVerificationToken();

  await UserSecurityModel.updateOne(
    { userId: user._id },
    { 'verification.token': hashedToken, 'verification.expiresAt': expiry }
  );

  await sendVerificationEmail(emailArg, token);
  console.log('✅ ส่งอีเมลยืนยันเรียบร้อย');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });