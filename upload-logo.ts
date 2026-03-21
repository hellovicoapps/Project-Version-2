import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });
}

async function uploadLogo() {
  const bucket = admin.storage().bucket();
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  
  if (!fs.existsSync(logoPath)) {
    console.error("Logo not found at", logoPath);
    return;
  }

  const destination = "businesses/public/logo.png";
  console.log("Uploading logo to", destination);
  
  await bucket.upload(logoPath, {
    destination,
    metadata: {
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
    }
  });
  
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(destination)}?alt=media`;
  console.log("PUBLIC_URL:", publicUrl);
}

uploadLogo().catch(console.error);
