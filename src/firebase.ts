import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the named database if provided, otherwise use the default one
let dbInstance: Firestore;
try {
  const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" 
    ? firebaseConfig.firestoreDatabaseId 
    : undefined;

  console.log("Initializing Firestore with database:", databaseId || "(default)");
  
  // Force long polling to bypass ERR_QUIC_PROTOCOL_ERROR in some network environments
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, databaseId);
} catch (e) {
  console.error("Failed to initialize Firestore with named database, falling back to default:", e);
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
}

export const db = dbInstance;
export const storage = getStorage(app);

// Connection test moved to App.tsx
export async function testConnection() {
  console.log("Testing Firestore connection to database:", firebaseConfig.firestoreDatabaseId);
  try {
    if (!db) {
      throw new Error("Firestore instance (db) is not initialized.");
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    console.error("Firestore connection test failed:", error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
      console.log("Attempting to use default database as fallback...");
      try {
        const defaultDb = getFirestore(app);
        await getDocFromServer(doc(defaultDb, 'test', 'connection'));
        console.log("Default database connection successful. Please update firebase-applet-config.json to use (default) database.");
      } catch (fallbackError) {
        console.error("Default database fallback also failed:", fallbackError);
      }
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  // Use a safer way to stringify to avoid circular structure errors
  let serializedInfo: string;
  try {
    serializedInfo = JSON.stringify(errInfo);
  } catch (stringifyError) {
    console.error('Failed to stringify error info:', stringifyError);
    serializedInfo = JSON.stringify({
      error: errInfo.error,
      operationType: errInfo.operationType,
      path: errInfo.path,
      authInfo: { userId: errInfo.authInfo.userId } // Minimal info
    });
  }

  console.error('Firestore Error:', serializedInfo);
  throw new Error(serializedInfo);
}

export default app;
