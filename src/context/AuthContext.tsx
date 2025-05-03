// src/context/AuthContext.tsx
"use client"
import { createContext, useContext, useCallback, ReactNode } from "react";
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { SessionUser } from "@/app/api/auth/[...nextauth]/options";

// Define the shape of the AuthContext
interface AuthContextType {
  user: SessionUser | null;
  status: "authenticated" | "loading" | "unauthenticated";
  signIn: (email: string, password: string, username?: string) => Promise<{ error?: string }>;
  signUp: (email: string, username: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | null;

  // Sign-in function
  const signIn = useCallback(
    async (email: string, password: string, username?: string) => {
      try {
        const result = await nextAuthSignIn("credentials", {
          redirect: false,
          email,
          password,
          username: username || email, // Fallback to email if username is not provided
        });

        if (result?.error) {
          return { error: result.error };
        }
        return {};
      } catch (error) {
        return { error: "An unexpected error occurred during sign-in" };
      }
    },
    []
  );

  // Sign-up function
  const signUp = useCallback(
    async (email: string, username: string, password: string) => {
      try {
        // Make a POST request to a custom sign-up API route
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || "Failed to sign up" };
        }

        // Automatically sign in after successful sign-up
        const signInResult = await signIn(email, password, username);
        return signInResult;
      } catch (error) {
        return { error: "An unexpected error occurred during sign-up" };
      }
    },
    [signIn]
  );

  // Sign-out function
  const signOut = useCallback(async () => {
    await nextAuthSignOut({ redirect: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};