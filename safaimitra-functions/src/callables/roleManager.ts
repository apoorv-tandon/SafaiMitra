import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Callable function to securely assign a role to a user.
 * Only super_admins can assign org_admins.
 * org_admins can assign supervisors and cleaners within their tenant.
 */
export const setCustomUserRole = functions.https.onCall(async (data, context) => {
  // Check if request is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { targetUid, targetRole, targetTenantId } = data;
  
  if (!targetUid || !targetRole) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid or role.');
  }

  const callerUid = context.auth.uid;
  const db = admin.firestore();
  
  // Verify caller privileges
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Caller profile not found.');
  }
  
  const callerData = callerDoc.data();
  const isSuperAdmin = callerData?.role === 'super_admin';
  const isOrgAdmin = callerData?.role === 'org_admin';
  
  // Authorization logic
  if (!isSuperAdmin) {
    if (!isOrgAdmin || callerData?.tenantId !== targetTenantId) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to manage this tenant.');
    }
    // Org Admin cannot create Super Admins or other Org Admins
    if (targetRole === 'super_admin' || targetRole === 'org_admin') {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to assign this role.');
    }
  }

  try {
    // Set Custom Claims for Firebase Auth
    await admin.auth().setCustomUserClaims(targetUid, { 
      role: targetRole,
      tenantId: targetTenantId 
    });
    
    // Update the User document in Firestore to reflect the role
    await db.collection('users').doc(targetUid).set({
      role: targetRole,
      tenantId: targetTenantId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, message: `Successfully assigned role ${targetRole} to user ${targetUid}` };
  } catch (error) {
    functions.logger.error('Error setting custom claim:', error);
    throw new functions.https.HttpsError('internal', 'Error setting custom claims.');
  }
});
