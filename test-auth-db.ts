import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const email = "backend@vicoapps.com";
    const password = "securepassword123";
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    console.log("Signed in with UID:", uid);

    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: email,
        name: "Backend Processor",
        role: "admin"
      });
      console.log("Created user document with admin role!");
    } else {
      console.log("User document already exists:", userDoc.data());
    }
  } catch (e: any) {
    console.error("Error:", e.message, "Code:", e.code);
  } finally {
    process.exit(0);
  }
}

test();
