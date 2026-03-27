import admin from "firebase-admin";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

async function test() {
  try {
    const user = await admin.auth().getUserByEmail("hello.vicoapps@gmail.com");
    console.log("Success:", user.uid);
  } catch (e: any) {
    console.error("Error:", e.message, "Code:", e.code);
  }
}

test();
