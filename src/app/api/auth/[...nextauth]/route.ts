import { IUser } from '@/backend/models/User';
import { compare } from 'bcryptjs';
import mongoose from 'mongoose';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * ไฟล์นี้เป็นจุดเริ่มต้นของ Next-Auth Route Handler
 * รับผิดชอบในการจัดการการร้องขอ authentication จาก client
 * 
 * GET: สำหรับตรวจสอบสถานะการเข้าสู่ระบบและการดึงข้อมูล session
 * POST: สำหรับเข้าสู่ระบบและสร้าง session
 */

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Record<"username" | "password", string> | undefined) {
        if (!credentials?.password || !credentials?.username) {
          throw new Error('Please enter username and password');
        }

        await connectDB();

        const UserModel = mongoose.model<IUser>('User');
        const user = await UserModel.findOne({ username: credentials.username });

        if (!user) {
          throw new Error('No user found');
        }

        const isValid = await compare(credentials.password, user.password as string);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          name: user.username,
          email: user.email,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };

