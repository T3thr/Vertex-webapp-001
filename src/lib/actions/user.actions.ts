export const saveReadingProgress = async (
  userId: string,
  novelId: string,
  episodeId: string,
  lastSceneId: string,
  isCompleted: boolean
) => {
  try {
    const response = await fetch('/api/user/reading-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, novelId, episodeId, lastSceneId, isCompleted }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save reading progress');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving reading progress:', error);
    // Depending on requirements, you might want to re-throw the error
    // or handle it gracefully, maybe with a user-facing notification.
    throw error;
  }
};
