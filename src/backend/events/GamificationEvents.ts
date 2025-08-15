
import EventEmitter from 'events';

// Create a new event emitter instance
const gamificationEventEmitter = new EventEmitter();

// Define event names as constants to avoid typos
export const GamificationEvents = {
  USER_COMPLETED_STORY: 'USER_COMPLETED_STORY',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  // Add other gamification-related events here
};

/**
 * Emits an event when a user completes a story.
 * @param userId The ID of the user.
 * @param storyId The ID of the story.
 */
export const emitUserCompletedStory = (userId: string, storyId: string) => {
  gamificationEventEmitter.emit(GamificationEvents.USER_COMPLETED_STORY, { userId, storyId });
};

/**
 * Emits an event when a user logs in.
 * @param userId The ID of the user.
 */
export const emitUserLoggedIn = (userId: string) => {
    gamificationEventEmitter.emit(GamificationEvents.USER_LOGGED_IN, { userId });
};


export default gamificationEventEmitter;