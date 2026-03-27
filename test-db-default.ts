import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const defaultDb = getFirestore();

async function test() {
  try {
    await defaultDb.collection("test").limit(1).get();
    console.log("Success!");
  } catch (e: any) {
    console.error("Error:", e.message, "Code:", e.code);
  }
}

test();
