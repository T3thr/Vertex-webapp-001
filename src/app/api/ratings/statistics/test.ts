// Test script for ratings statistics API
// This is a simple test to verify that the API works correctly
// You can run this test manually by executing:
// node -r ts-node/register src/app/api/ratings/statistics/test.ts

import { RateableType } from "@/backend/models/Rating";
import RatingReviewService from "@/backend/services/RatingReview";

async function testRatingStatistics() {
  try {
    console.log("Testing RatingReviewService.getTargetStatistics...");
    
    // Replace with a valid target ID from your database
    const targetId = "your_target_id_here";
    const targetType = RateableType.NOVEL;
    
    console.log(`Fetching statistics for targetId: ${targetId}, targetType: ${targetType}`);
    
    const stats = await RatingReviewService.getTargetStatistics(targetId, targetType);
    
    console.log("Statistics fetched successfully:");
    console.log(JSON.stringify(stats, null, 2));
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

// Uncomment to run the test
// testRatingStatistics();
