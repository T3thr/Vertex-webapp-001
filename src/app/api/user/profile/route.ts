import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import dbConnect from '@/backend/lib/mongodb';
import UserModel from '@/backend/models/User';
import UserProfileModel from '@/backend/models/UserProfile';
import mongoose from 'mongoose';

// Helper function to handle file uploads
async function handleFileUpload(formData: FormData) {
  const file = formData.get('profileImage') as File;
  if (!file) return null;

  try {
    // In a real implementation, you would upload this to a storage service
    // like S3, Cloudinary, etc. and return the URL
    
    // For demo purposes, we'll use the public images directory
    // In a production app, replace this with actual cloud storage upload
    
    // Generate a unique filename
    const fileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
    const filePath = `/images/${fileName}`;
    
    // In a real app, you would save the file to disk or cloud storage here
    // For this demo, we'll just return a path to an existing image
    return '/images/default-avatar.png';
  } catch (error) {
    console.error('File upload error:', error);
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Get user profile
    const userProfile = await UserProfileModel.findOne({ userId: session.user.id }).lean();
    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Remove sensitive fields
    const { __v, createdAt, updatedAt, ...profile } = userProfile;

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Parse form data
    const formData = await request.formData();
    
    // Handle file upload if present
    let avatarUrl = formData.get('avatarUrl') as string;
    const newAvatarUrl = await handleFileUpload(formData);
    if (newAvatarUrl) {
      avatarUrl = newAvatarUrl;
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      displayName: formData.get('displayName'),
      bio: formData.get('bio'),
      websiteUrl: formData.get('facebook'), // Using facebook field as websiteUrl
      location: formData.get('location'),
      primaryPenName: formData.get('primaryPenName'),
    };
    
    // Handle showTrophies setting
    const showTrophiesValue = formData.get('showTrophies');
    if (showTrophiesValue !== null) {
      updateData.showTrophies = showTrophiesValue === 'true';
    }
    
    // Handle penNames array
    const penNamesStr = formData.get('penNames');
    if (penNamesStr) {
      try {
        const penNames = JSON.parse(penNamesStr as string);
        if (Array.isArray(penNames)) {
          updateData.penNames = penNames;
          
          // Validate primaryPenName exists in penNames
          if (updateData.primaryPenName && !penNames.includes(updateData.primaryPenName)) {
            // If primaryPenName doesn't exist in penNames, add it
            updateData.penNames.push(updateData.primaryPenName);
          }
          
          // If no primaryPenName but penNames exist, set first one as primary
          if (!updateData.primaryPenName && penNames.length > 0) {
            updateData.primaryPenName = penNames[0];
          }
        }
      } catch (error) {
        console.error('Error parsing penNames:', error);
      }
    }

    // Add avatar URL if we have one
    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }

    // Clean undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // Find existing profile or create new one
    let userProfile = await UserProfileModel.findOne({ userId: session.user.id });
    
    if (!userProfile) {
      // Create new profile if it doesn't exist
      userProfile = new UserProfileModel({
        userId: new mongoose.Types.ObjectId(session.user.id),
        ...updateData,
        joinDate: new Date(),
        socialStats: {
          followersCount: 0,
          followingUsersCount: 0,
          followingNovelsCount: 0,
          novelsCreatedCount: 0,
          boardPostsCreatedCount: 0,
          commentsMadeCount: 0,
          ratingsGivenCount: 0,
          likesGivenCount: 0,
        }
      });
    } else {
      // Update existing profile
      Object.assign(userProfile, updateData);
    }

    // Save profile
    await userProfile.save();

    // If primaryPenName or avatarUrl changed, update the User model as well (denormalized data)
    if (updateData.primaryPenName || updateData.avatarUrl) {
      const updateUserData: Record<string, any> = {};
      
      if (updateData.primaryPenName) {
        updateUserData.primaryPenName = updateData.primaryPenName;
      }
      
      if (updateData.avatarUrl) {
        updateUserData.avatarUrl = updateData.avatarUrl;
      }
      
      await UserModel.findByIdAndUpdate(session.user.id, updateUserData);
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}