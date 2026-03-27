import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  try {
    await signInWithEmailAndPassword(auth, 'hello.vicoapps@gmail.com', 'securepassword123');
    console.log('Signed in as', auth.currentUser.uid);
    
    const docRef = doc(db, 'businesses', auth.currentUser.uid);
    await setDoc(docRef, {
      name: 'Test',
      ownerId: auth.currentUser.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('Successfully updated business');
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
main();
