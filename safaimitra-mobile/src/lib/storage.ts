import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUEUE_KEY = '@offline_submission_queue';

export const addToOfflineQueue = async (submission: any) => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(submission);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving to offline queue', e);
  }
};

export const getOfflineQueue = async () => {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    console.error('Error reading offline queue', e);
    return [];
  }
};

export const clearOfflineQueue = async () => {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    console.error('Error clearing offline queue', e);
  }
};
