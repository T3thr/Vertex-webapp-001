
import gamificationEventEmitter, { GamificationEvents } from '../events/GamificationEvents';
import { gamificationService } from '../services/GamificationService';

// Define the structure of the event payloads
interface UserCompletedStoryPayload {
  userId: string;
  storyId: string;
}

interface UserLoggedInPayload {
    userId: string;
}


class GamificationListener {
  public registerListeners() {
    gamificationEventEmitter.on(
      GamificationEvents.USER_COMPLETED_STORY,
      this.handleUserCompletedStory
    );

    gamificationEventEmitter.on(
        GamificationEvents.USER_LOGGED_IN,
        this.handleUserLoggedIn
      );

    console.log('Gamification listeners registered.');
  }

  private async handleUserCompletedStory(payload: UserCompletedStoryPayload) {
    try {
      console.log(`Event received: ${GamificationEvents.USER_COMPLETED_STORY}`, payload);
      // Award 10 points for completing a story
      await gamificationService.awardPoints(payload.userId, 10);

      // Potentially unlock an achievement
      // Example: Unlock 'FIRST_STORY' achievement
      await gamificationService.trackAchievementProgress(payload.userId, 'FIRST_STORY_COMPLETED', 1);

    } catch (error) {
      console.error('Error handling USER_COMPLETED_STORY event:', error);
    }
  }

  private async handleUserLoggedIn(payload: UserLoggedInPayload) {
    try {
      console.log(`Event received: ${GamificationEvents.USER_LOGGED_IN}`, payload);
      // Award 1 point for logging in
      await gamificationService.awardPoints(payload.userId, 1);
    } catch (error) {
      console.error('Error handling USER_LOGGED_IN event:', error);
    }
  }
}

export const gamificationListener = new GamificationListener();