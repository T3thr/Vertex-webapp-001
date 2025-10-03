import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";
import dbConnect from "@/backend/lib/mongodb";
import UserProfileModel from "@/backend/models/UserProfile";
import ProfileEdit from "@/components/profile/ProfileEdit";

/**
 * Fetches user profile data from the database
 */
async function getUserProfile(userId: string) {
  try {
    await dbConnect();
    const profile = await UserProfileModel.findOne({ userId }).lean();
    
    // If no profile exists yet, return a basic structure
    if (!profile) {
      return { userId };
    }
    
    // Serialize MongoDB objects for client-side use
    const serialize = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'object' && obj instanceof Date) return obj.toISOString();
      if (typeof obj === 'object' && obj._bsontype === 'ObjectID') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serialize);
      if (typeof obj === 'object') {
        const res: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            res[key] = serialize(obj[key]);
          }
        }
        return res;
      }
      return obj;
    };
    
    return serialize(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { userId };
  }
}

export default async function ProfileEditPage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/profile/edit");
  }

  // Get user profile data
  const profileData = await getUserProfile(session.user.id);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          แก้ไขโปรไฟล์
        </h1>
      </div>
      
      <ProfileEdit initialProfile={profileData} />
    </div>
  );
}