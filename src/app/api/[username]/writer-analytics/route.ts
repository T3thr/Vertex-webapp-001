// src/app/api/users/[username]/writer-analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Assuming this path is correct
import { User } from "@/models/User"; // Assuming User model exists
import { WriterStats } from "@/models/WriterStats"; // Assuming WriterStats model exists
import { Novel } from "@/models/Novel"; // Assuming Novel model exists
import { Purchase } from "@/models/Purchase"; // Assuming Purchase model exists
import { Donation } from "@/models/Donation"; // Assuming Donation model exists
import { EarningAnalytic } from "@/models/EarningAnalytic"; // Assuming EarningAnalytic model exists

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as { id: string; username: string; role: string } | undefined;
    const requestedUsername = params.username;

    // Authentication: Check if user is logged in
    if (!loggedInUser) {
      return NextResponse.json(
        { message: "Unauthorized: Not logged in" },
        { status: 401 }
      );
    }

    // Authorization: Check if the logged-in user is requesting their own analytics or is an Admin
    if (loggedInUser.username !== requestedUsername && loggedInUser.role !== "Admin") {
      return NextResponse.json(
        { message: "Forbidden: You do not have permission to view these analytics" },
        { status: 403 }
      );
    }

    // Find the user by username to get their ID
    const user = await User.findOne({ username: requestedUsername }).select('_id');
    if (!user) {
      // Try finding in SocialMediaUser if not in User (assuming username is unique across both)
      // This part might need adjustment based on your exact User/SocialMediaUser setup
      // For now, let's assume username is sufficient to find the user ID in the primary User model
      // or that SocialMediaUser also has a direct link to WriterStats if they can be writers.
      // For simplicity, we'll assume User model is the primary source for writers for now.
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const userId = user._id;

    // Fetch writer statistics
    const writerStats = await WriterStats.findOne({ userId });

    if (!writerStats) {
      return NextResponse.json(
        { message: "Writer statistics not found for this user" },
        { status: 404 }
      );
    }

    // Fetch novel performance (example: count of novels, total views - needs more specific aggregation)
    const novels = await Novel.find({ authorId: userId });
    const novelCount = novels.length;
    const totalNovelViews = novels.reduce((sum, novel) => sum + (novel.views || 0), 0);
    const totalNovelLikes = novels.reduce((sum, novel) => sum + (novel.likes || 0), 0); // Assuming 'likes' field

    // Fetch earnings (example: sum of purchases and donations - needs more specific aggregation)
    // This is a simplified example. In a real scenario, you'd likely have more complex queries
    // and potentially separate tables/collections for financial transactions linked to the writer.
    const purchases = await Purchase.find({ novelId: { $in: novels.map(n => n._id) } });
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.amountInCoins || 0), 0);

    const donations = await Donation.find({ writerId: userId });
    const totalDonationAmount = donations.reduce((sum, d) => sum + (d.amountInCoins || 0), 0);

    // Fetch earning analytics (example - this might be pre-calculated or aggregated differently)
    const earningAnalytics = await EarningAnalytic.find({ writerId: userId }).sort({ period: -1 }).limit(10); // Get last 10 periods

    const responseData = {
      writerStats,
      novelPerformance: {
        novelCount,
        totalNovelViews,
        totalNovelLikes,
        // You can add more detailed novel-specific stats here by iterating through `novels`
      },
      earnings: {
        totalCoinsFromPurchases: totalPurchaseAmount,
        totalCoinsFromDonations: totalDonationAmount,
        totalCoinsOverall: totalPurchaseAmount + totalDonationAmount,
        // Potentially convert coins to real money based on some exchange rate if needed
      },
      recentEarningAnalytics: earningAnalytics, // Last 10 earning periods
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("Error fetching writer analytics:", error);
    return NextResponse.json(
      { message: "Internal server error while fetching writer analytics", error: error.message },
      { status: 500 }
    );
  }
}

