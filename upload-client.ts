import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

async function upload() {
  await signInAnonymously(auth);
  const logoBuffer = fs.readFileSync("./public/logo.png");
  const logoRef = ref(storage, "public/logo.png");
  
  await uploadBytes(logoRef, logoBuffer, {
    contentType: "image/png",
    cacheControl: "public, max-age=31536000",
  });
  
  const url = await getDownloadURL(logoRef);
  console.log("Uploaded successfully. URL:", url);
  process.exit(0);
}

upload().catch(e => {
  console.error(e);
  process.exit(1);
});
