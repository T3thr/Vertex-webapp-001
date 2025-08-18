import * as dotenv from "dotenv";
dotenv.config();

import dbConnect from "../backend/lib/mongodb";
import UserModel from "../backend/models/User";
import UserSecurityModel from "../backend/models/UserSecurity";
import { generateVerificationToken, sendVerificationEmail } from "../backend/services/sendemail";

/**
 * Resend verification emails to all users created within the provided date range who are still unverified.
 *
 * Usage:
 *   bun run batch-resend-verification.ts            # default today (00:00-23:59)
 *   bun run batch-resend-verification.ts 2025-07-24  # specific YYYY-MM-DD
 *   bun run batch-resend-verification.ts 2025-07-24 2025-07-25 # explicit start & end date
 */
async function main() {
  // Parse CLI args: [startDate] [endDate]
  const [argStart, argEnd] = process.argv.slice(2);

  const todayStr = new Date().toISOString().split("T")[0];
  const startDate = new Date(argStart ?? todayStr);
  const endDate = new Date(argEnd ?? todayStr);
  // set time boundaries
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  console.log(`🔍 Finding unverified users created between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  await dbConnect();

  const unverifiedUsers = await UserModel.find({
    isEmailVerified: false,
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  if (!unverifiedUsers.length) {
    console.log("✅ No unverified users found in the specified range.");
    return;
  }

  console.log(`📋 ${unverifiedUsers.length} user(s) found – sending verification emails...`);

  const results: { email: string; ok: boolean; error?: any }[] = [];

  for (const lean of unverifiedUsers) {
    // Reload as full document to access methods
    const user = await UserModel.findById(lean._id);
    if (!user || !user.email) {
      console.warn(`⏭️  Skip user ${lean?._id} – no email field`);
      results.push({ email: "", ok: false, error: "missing email" });
      continue;
    }
    if (!user.email) {
      console.warn(`⏭️  Skip user ${user._id} – no email field`);
      results.push({ email: "", ok: false, error: "missing email" });
      continue;
    }
    try {
      // Use the same token generation logic as resend-verification API
      const { token: plainToken, hashedToken, expiry } = generateVerificationToken();
      
      // Update token in User model (same as API)
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpiry = expiry;
      await user.save();

      await sendVerificationEmail(user.email!, plainToken);
      console.log(`✅ Sent to ${user.email}`);
      results.push({ email: user.email, ok: true });
    } catch (err) {
      console.error(`❌ Failed for ${user.email}:`, err);
      results.push({ email: user.email, ok: false, error: err });
    }
  }

  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;
  console.log(`\n📊 Done. Success: ${success}, Failed: ${failed}`);

  if (failed) {
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
  console.error(e);
  process.exit(1);
});
