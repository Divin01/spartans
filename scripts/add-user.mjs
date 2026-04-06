/**
 * CLI script to add users to Firestore.
 *
 * Usage:
 *   node scripts/add-user.mjs <email> <name> <role>
 *
 * Examples:
 *   node scripts/add-user.mjs john@example.com "John Doe" manager
 *   node scripts/add-user.mjs jane@example.com "Jane Smith" member
 *
 * Make sure your .env.local file has the Firebase config values set.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env vars from .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
} catch {
  console.error("Could not read .env.local — make sure it exists.");
  process.exit(1);
}

const firebaseConfig = {

};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const [,, email, name, role] = process.argv;

if (!email || !name || !role) {
  console.log("Usage: node scripts/add-user.mjs <email> <name> <role>");
  console.log('  role: "manager" or "member"');
  process.exit(1);
}

if (role !== "manager" && role !== "member") {
  console.error('Role must be "manager" or "member".');
  process.exit(1);
}

// Check if user already exists
const existing = await getDocs(
  query(collection(db, "users"), where("email", "==", email.toLowerCase()))
);

if (!existing.empty) {
  console.log(`User with email "${email}" already exists.`);
  process.exit(0);
}

const ref = await addDoc(collection(db, "users"), {
  email: email.toLowerCase(),
  name,
  role,
  createdAt: new Date().toISOString(),
});

console.log(`✓ User created: ${name} (${email}) as ${role} — ID: ${ref.id}`);
process.exit(0);
