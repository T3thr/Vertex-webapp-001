"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

// Define the type for user profile data
interface UserProfile {
  displayName?: string; // Add displayName field
  bio?: string;
  location?: string;
  website?: string;
  [key: string]: any; // Allow for additional fields if needed
}

// Define the type for user data
type User = {
  role?: string;
  profile?: UserProfile;
  id?: string;
  username: string;
  email: string;
  avatar?: string;
};

// Define the type for context
type AuthContextType = {
  user: User | null;
  status: "unauthenticated" | "authenticated" | "loading";
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Define the type for props
interface AuthProviderProps {
  children: ReactNode;
}

// Create Context
const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "unauthenticated",
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

// Create Provider
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"unauthenticated" | "authenticated" | "loading">("loading");

  // Check auth status on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Simulate checking auth status from localStorage or token
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setStatus("unauthenticated");
      }
    };

    checkAuth();
  }, []);

  // Sign-in function
  const signIn = async (email: string, password: string) => {
    try {
      setStatus("loading");

      // Simulate API call for sign-in
      const mockUser: User = {
        id: "user-123",
        username: "ผู้ใช้ทดสอบ",
        email: email,
        role: "user",
        profile: {
          displayName: "ผู้ใช้ทดสอบ", // Add displayName to match MobileMenu expectation
        },
      };

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(mockUser));

      setUser(mockUser);
      setStatus("authenticated");
    } catch (error) {
      console.error("Sign in failed:", error);
      setStatus("unauthenticated");
      throw error;
    }
  };

  // Sign-up function
  const signUp = async (username: string, email: string, password: string) => {
    try {
      setStatus("loading");

      // Simulate API call for sign-up
      const mockUser: User = {
        id: "user-" + Math.floor(Math.random() * 1000),
        username: username,
        email: email,
        role: "user",
        profile: {
          displayName: username, // Add displayName to match MobileMenu expectation
        },
      };

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(mockUser));

      setUser(mockUser);
      setStatus("authenticated");
    } catch (error) {
      console.error("Sign up failed:", error);
      setStatus("unauthenticated");
      throw error;
    }
  };

  // Sign-out function
  const signOut = async () => {
    try {
      // Remove user data from localStorage
      localStorage.removeItem("user");

      setUser(null);
      setStatus("unauthenticated");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, status, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Create hook to use context
export const useAuth = () => useContext(AuthContext);