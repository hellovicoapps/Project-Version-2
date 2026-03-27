import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const defaultDb = getFirestore();

defaultDb.collection("businesses").onSnapshot(
  (snapshot) => {
    console.log("Snapshot received!");
    process.exit(0);
  },
  (error: any) => {
    console.error("Snapshot error:", error.message, "Code:", error.code);
    process.exit(1);
  }
);
