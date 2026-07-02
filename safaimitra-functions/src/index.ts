import * as admin from 'firebase-admin';

// Initialize the Firebase Admin App
admin.initializeApp();

// Export all triggers and callables
export * from './triggers/feedbackTrigger';
export * from './callables/roleManager';
