// Script to initialize the super admin account
// Run with: node scripts/init-super-admin.js

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

async function initializeSuperAdmin() {
  try {
    console.log("Initializing super admin account...");
    
    const result = await client.mutation("seed:createSuperAdmin", {
      email: "michael.ruderman@cyansociety.org",
      name: "Michael Ruderman"
    });
    
    console.log("✅ Super admin account initialized successfully!");
    console.log("Result:", result);
    
    // Check if the user exists
    const userCheck = await client.query("seed:checkUserExists", {
      email: "michael.ruderman@cyansociety.org"
    });
    
    console.log("User verification:", userCheck);
    
  } catch (error) {
    console.error("❌ Failed to initialize super admin:", error);
  }
}

initializeSuperAdmin();
