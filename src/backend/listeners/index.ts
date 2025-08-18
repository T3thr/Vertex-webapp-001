
import { gamificationListener } from './GamificationListener';

// A flag to ensure listeners are registered only once
let areListenersRegistered = false;

export const registerAppListeners = () => {
  if (!areListenersRegistered) {
    gamificationListener.registerListeners();
    // Register other listeners here in the future
    
    areListenersRegistered = true;
    console.log('Application listeners have been successfully registered.');
  }
};