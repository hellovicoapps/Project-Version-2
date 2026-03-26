import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const b1 = "IMmojJnDeVN8txOxCWIzbm7Zuxm2"; // Vico
  const b2 = "sQRy1eRlu9RLE3IPgTnaJfcaBqY2"; // The Becoming

  console.log("Calls for Vico:");
  const q1 = query(collection(db, "businesses", b1, "calls"));
  const snap1 = await getDocs(q1);
  const calls1 = [];
  snap1.forEach(doc => calls1.push({ id: doc.id, ...doc.data() }));
  calls1.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).slice(0, 5).forEach(c => console.log(c.id, c.status, c.callerName, new Date(c.createdAt?.seconds * 1000).toISOString()));

  console.log("Calls for The Becoming:");
  const q2 = query(collection(db, "businesses", b2, "calls"));
  const snap2 = await getDocs(q2);
  const calls2 = [];
  snap2.forEach(doc => calls2.push({ id: doc.id, ...doc.data() }));
  calls2.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).slice(0, 5).forEach(c => console.log(c.id, c.status, c.callerName, new Date(c.createdAt?.seconds * 1000).toISOString()));
}

check().catch(console.error);
