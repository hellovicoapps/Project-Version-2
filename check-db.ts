import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

async function check() {
  const snapshot = await db.collection("businesses").get();
  snapshot.forEach(doc => {
    console.log(doc.id, "=>", doc.data().name);
  });
}

check().catch(console.error);
