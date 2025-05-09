// src/app/api/users/me/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust path as needed
import { User } from "@/models/User"; // Assuming User model exists
import { UserPreference } from "@/models/UserPreference"; // Assuming UserPreference model exists

// Helper function to get user ID from session
async function getUserIdFromSession() {
  const session = await getServerSession(authOptions);
  const loggedInUser = session?.user as { id: string; username: string; role: string } | undefined;
  return loggedInUser?.id;
}

// GET handler for fetching user settings
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession();

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized: Not logged in" },
        { status: 401 }
      );
    }

    // Fetch user settings - this is a simplified example.
    // You would typically fetch from UserPreference model based on userId.
    // For now, let's assume we fetch the whole User object which might contain preferences or link to them.
    const user = await User.findById(userId).select("-password"); // Exclude password

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Assuming User model has a direct or populated field for preferences
    // Or, you might have a separate UserPreference.findOne({ userId })
    const userPreferences = await UserPreference.findOne({ userId });

    if (!userPreferences) {
        // If no preferences found, maybe return default or an empty object, 
        // or create a default one if that's the desired behavior.
        // For now, returning a message indicating no preferences found.
        return NextResponse.json({ message: "User preferences not found. Please create them first." }, { status: 404 });
    }

    return NextResponse.json({ settings: userPreferences }, { status: 200 });

  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { message: "Internal server error while fetching user settings" },
      { status: 500 }
    );
  }
}

// PUT handler for updating user settings
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromSession();

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized: Not logged in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    // Add validation for the body content here (e.g., using a Zod schema)

    // Update user settings
    // Again, this is simplified. You'd update specific fields in User or UserPreference model.
    const updatedUserPreferences = await UserPreference.findOneAndUpdate(
      { userId }, 
      { $set: body }, 
      { new: true, upsert: true } // new: return the modified document rather than the original. upsert: create if not exists
    );

    if (!updatedUserPreferences) {
        return NextResponse.json({ message: "Failed to update settings or user not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Settings updated successfully", settings: updatedUserPreferences },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { message: "Internal server error while updating user settings", error: error.message },
      { status: 500 }
    );
  }
}

