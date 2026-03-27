import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import fs from "fs";
import path from "path";

let backendDbInstance: any = null;

export async function getBackendDb() {
  if (backendDbInstance) return backendDbInstance;

  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("[Server] firebase-applet-config.json not found. Backend DB cannot be initialized.");
      return null;
    }

    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const app = initializeApp(firebaseConfig, "backendApp");
    const auth = getAuth(app);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const email = "backend@vicoapps.com";
    const password = "securepassword123";

    await signInWithEmailAndPassword(auth, email, password);
    console.log("[Server] Authenticated backend user successfully.");
    
    backendDbInstance = db;
    return db;
  } catch (error) {
    console.error("[Server] Failed to initialize backend DB:", error);
    return null;
  }
}
