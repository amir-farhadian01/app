import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function resetDesign() {
  console.log("Starting full design reset...");
  
  try {
    // 1. Reset Global Theme
    console.log("Resetting system_config/global theme...");
    await updateDoc(doc(db, 'system_config', 'global'), {
      'theme.backgroundColor': deleteField(),
      'theme.textColor': deleteField(),
      'theme.borderRadius': deleteField()
    });
    console.log("Global theme reset.");

    // 2. Clear all component overrides
    console.log("Clearing cms_visual_elements...");
    const snapshot = await getDocs(collection(db, 'cms_visual_elements'));
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'cms_visual_elements', d.id)));
    await Promise.all(deletePromises);
    console.log(`Cleared ${snapshot.size} visual elements.`);
    
    console.log("SUCCESS: Platform design has been reset to factory defaults.");
    process.exit(0);
  } catch (err) {
    console.error("ERROR during reset:", err);
    process.exit(1);
  }
}

resetDesign();
