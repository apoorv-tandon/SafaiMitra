import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onCustomerFeedbackCreated = functions.firestore
  .document('customer_feedback/{feedbackId}')
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    
    // Check if the rating is bad (1 or 2 stars)
    if (feedback.rating <= 2) {
      const db = admin.firestore();
      
      // Create an escalation alert
      const alertData = {
        tenantId: feedback.tenantId,
        washroomId: feedback.washroomId,
        feedbackId: context.params.feedbackId,
        rating: feedback.rating,
        issues: feedback.issues || [],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'open',
        message: 'Low rating received. Immediate attention required.'
      };
      
      try {
        await db.collection('escalation_alerts').add(alertData);
        functions.logger.info(`Escalation alert created for washroom ${feedback.washroomId}`);
        
        // TODO: In a production scenario, you would trigger FCM push notifications to the Supervisor here.
        // admin.messaging().sendToTopic(...)
        
      } catch (error) {
        functions.logger.error('Failed to create escalation alert', error);
      }
    }
    
    return null;
  });
