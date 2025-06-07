import { IUser } from '@/backend/models/User';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log('Connected to MongoDB');
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

// GET /api/settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user from database
    const UserModel = mongoose.model<IUser>('User');
    const user = await UserModel.findById(session.user.id)
      .select('-password') // Exclude password
      .lean(); // Convert to plain JavaScript object

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const data = await req.json();

    await connectDB();

    // Get user from database
    const UserModel = mongoose.model<IUser>('User');
    const user = await UserModel.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedFields = [
      'profile',
      'preferences',
      'securitySettings',
    ];

    allowedFields.forEach((field) => {
      if (data[field]) {
        user[field] = {
          ...user[field],
          ...data[field],
        };
      }
    });

    await user.save();

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error in PUT /api/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const data = await req.json();

    await connectDB();

    // Get user from database
    const UserModel = mongoose.model<IUser>('User');
    const updateResult = await UserModel.findByIdAndUpdate(
      session.user.id,
      { $set: data },
      { 
        new: true, 
        runValidators: true,
        select: '-password'
      }
    );

    if (!updateResult) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updateResult);
  } catch (error) {
    console.error('Error in PATCH /api/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 