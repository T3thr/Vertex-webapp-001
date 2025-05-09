// src/backend/models/DonationApplication.ts

import mongoose, { Schema, model, Document } from 'mongoose';

// Define the interface for the DonationApplication document
export interface IDonationApplication extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Reference to the User model (writer)
  status: 'pending' | 'approved' | 'rejected'; // Status of the application
  reason?: string; // Reason for rejection, if applicable
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the DonationApplication model
const DonationApplicationSchema = new Schema<IDonationApplication>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // A user can only have one application
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create and export the DonationApplication model
const DonationApplication = mongoose.models.DonationApplication || model<IDonationApplication>('DonationApplication', DonationApplicationSchema);

export default DonationApplication;

