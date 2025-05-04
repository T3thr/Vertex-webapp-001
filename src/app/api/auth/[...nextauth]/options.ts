import dbConnect from "@/backend/lib/mongodb";
import { compare } from "bcryptjs";
import mongoose from "mongoose";
import { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import LineProvider from "next-auth/providers/line";
import TwitterProvider from "next-auth/providers/twitter";

export type SessionUser = {
  image: any;
  id: string;
  email: string;
  username: string;
  role: "Reader" | "Writer" | "Admin";
  profile: {
    avatar?: string;
    bio?: string;
    displayName?: string;
  };
};

const isAdminEmail = (email: string): boolean => {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(email);
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        await dbConnect();
        const UserModel = mongoose.models.User || 
          mongoose.model("User", require("@/backend/models/User").default().schema);

        const user = await UserModel.findOne({ 
          $or: [
            { email: credentials.email },
            { username: credentials.username }
          ]
        });

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        if (!user.isEmailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        const role = isAdminEmail(user.email) ? "Admin" : user.role;

        user.lastLogin = new Date();
        await user.save();

        return {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          role,
          profile: user.profile,
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0",
      allowDangerousEmailAccountLinking: true,
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: process.env.APPLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),

    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.username = token.username as string;
        session.user.role = token.role as "Reader" | "Writer" | "Admin";
        session.user.profile = token.profile as {
          avatar?: string;
          bio?: string;
          displayName?: string;
        };
      }
      return session;
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
        token.profile = user.profile;
      }

      if (account && profile) {
        await dbConnect();
        let UserModel;
        switch (account.provider) {
          case "google":
            UserModel = mongoose.models.GoogleUser || 
              mongoose.model("GoogleUser", require("@/backend/models/GoogleUser").default().schema);
            break;
          case "twitter":
            UserModel = mongoose.models.TwitterUser || 
              mongoose.model("TwitterUser", require("@/backend/models/TwitterUser").default().schema);
            break;
          case "facebook":
            UserModel = mongoose.models.FacebookUser || 
              mongoose.model("FacebookUser", require("@/backend/models/FacebookUser").default().schema);
            break;
          case "apple":
            UserModel = mongoose.models.AppleUser || 
              mongoose.model("AppleUser", require("@/backend/models/AppleUser").default().schema);
            break;
          case "line":
            UserModel = mongoose.models.LineUser || 
              mongoose.model("LineUser", require("@/backend/models/LineUser").default().schema);
            break;
          default:
            UserModel = mongoose.models.User || 
              mongoose.model("User", require("@/backend/models/User").default().schema);
        }

        const existingUser = await UserModel.findOne({ email: token.email });

        if (existingUser) {
          token.username = existingUser.username;
          token.role = isAdminEmail(existingUser.email) ? "Admin" : existingUser.role;
          token.profile = existingUser.profile;

          existingUser.lastLogin = new Date();
          await existingUser.save();
        } else {
          const username = `user_${Math.random().toString(36).substring(2, 10)}`;

          const newUser = new UserModel({
            email: token.email,
            username,
            role: isAdminEmail(token.email as string) ? "Admin" : "Reader",
            profile: {
              displayName: token.name,
              avatar: token.picture,
            },
            providerId: account.providerAccountId,
            lastLogin: new Date(),
          });

          await newUser.save();

          token.username = username;
          token.role = isAdminEmail(token.email as string) ? "Admin" : "Reader";
          token.profile = {
            displayName: token.name ?? undefined,
            avatar: token.picture ?? undefined,
          };
        }
      }

      return token;
    },
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

declare module "next-auth" {
  interface User {
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
  }

  interface Session {
    user: SessionUser & {
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username: string;
    role: "Reader" | "Writer" | "Admin";
    profile: {
      avatar?: string;
      bio?: string;
      displayName?: string;
    };
  }
}