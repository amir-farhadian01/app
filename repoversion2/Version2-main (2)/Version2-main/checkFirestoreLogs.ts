import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkLogs() {
  console.log("Fetching recent error logs from audit_logs...");
  try {
    const q = query(
      collection(db, 'audit_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(10)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log("No logs found.");
    } else {
      snap.docs.forEach(d => {
        const data = d.data();
        console.log(`[${data.timestamp?.toDate?.() || data.timestamp}] ${data.type}: ${data.action}`);
        console.log("Details:", JSON.stringify(data.details, null, 2));
        console.log("---");
      });
    }
    process.exit(0);
  } catch (err) {
    console.error("Error reading logs:", err);
    process.exit(1);
  }
}

checkLogs();
