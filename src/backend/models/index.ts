export type UserRole = "Reader" | "Writer" | "Admin";

export interface Profile {
  displayName?: string;
  avatar?: string;
  bio?: string;
}