import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

async function upload() {
  try {
    // Try anonymous auth first
    const userCredential = await signInAnonymously(auth);
    console.log("Signed in anonymously:", userCredential.user.uid);
    
    const logoBuffer = fs.readFileSync("./public/logo.png");
    const logoRef = ref(storage, `businesses/${userCredential.user.uid}/logo.png`);
    
    await uploadBytes(logoRef, logoBuffer, {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
    });
    
    const url = await getDownloadURL(logoRef);
    console.log("Uploaded successfully. URL:", url);
    process.exit(0);
  } catch (e) {
    console.error("Upload failed:", e);
    process.exit(1);
  }
}

upload();
