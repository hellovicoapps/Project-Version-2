import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    const email = "backend@vicoapps.com";
    const password = "securepassword123";
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Signed in!");
    } catch (e: any) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("Created user and signed in!");
      } else {
        throw e;
      }
    }
  } catch (e: any) {
    console.error("Error:", e.message, "Code:", e.code);
  }
}

test();
