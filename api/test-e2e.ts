import { PrismaClient } from "@prisma/client";

const API_URL = "http://localhost:5000/api/v1";
const ADMIN_API_URL = "http://localhost:5000/api/v1/admin";

import prisma from "./src/lib/prisma";

async function myFetch(url: string, options: any = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw { response: { data } };
  }
  return { data };
}

async function runTests() {
  console.log("Starting E2E Tests...\n");

  const testEmail = `testuser_${Date.now()}@example.com`;
  const password = "Password123!";

  // 1. Register a new user
  console.log("1. Registering new user...");
  try {
    const regRes = await myFetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: password,
        fullName: "Test User",
        phone: "0123456789"
      })
    });
    console.log("   ✅ Registration successful", regRes.data);
  } catch (err: any) {
    console.error("   ❌ Registration failed", err.response?.data || err.message);
    process.exit(1);
  }

  // 2. Try to login before approval -> Should fail with ACCOUNT_PENDING
  console.log("\n2. Trying to login before approval (Should fail)...");
  try {
    await myFetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });
    console.error("   ❌ Login succeeded but should have failed!");
    process.exit(1);
  } catch (err: any) {
    if (err.response?.data?.error?.code === "ACCOUNT_PENDING") {
      console.log("   ✅ Login failed as expected with ACCOUNT_PENDING");
    } else {
      console.error("   ❌ Login failed with unexpected error", err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 3. Login as Admin
  console.log("\n3. Logging in as Admin...");
  let adminToken = "";
  try {
    const adminRes = await myFetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "vietnmf8@fullstack.edu.vn",
        password: "Viet251001"
      })
    });
    adminToken = adminRes.data.data.token;
    console.log("   ✅ Admin login successful");
  } catch (err: any) {
    console.error("   ❌ Admin login failed", err.response?.data || err.message);
    process.exit(1);
  }

  // 4. Fetch PENDING users
  console.log("\n4. Fetching PENDING users...");
  let userIdToApprove = "";
  try {
    const pendingRes = await myFetch(`${ADMIN_API_URL}/users?accountStatus=PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const users = pendingRes.data.data;
    const testUser = users.find((u: any) => u.email === testEmail);
    
    if (testUser) {
      userIdToApprove = testUser.id;
      console.log(`   ✅ Found pending user: ${userIdToApprove}`);
    } else {
      console.error("   ❌ Could not find the registered user in PENDING list");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("   ❌ Failed to fetch pending users", err.response?.data || err.message);
    process.exit(1);
  }

  // 5. Admin approves the user
  console.log("\n5. Admin approving the user...");
  try {
    await myFetch(`${ADMIN_API_URL}/users/${userIdToApprove}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("   ✅ User approved successfully");
  } catch (err: any) {
    console.error("   ❌ Failed to approve user", err.response?.data || err.message);
    process.exit(1);
  }

  // Wait briefly for worker to create job
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 6. Extract token from DB (BackgroundJob or direct generation if processed)
  console.log("\n6. Extracting verification token from DB...");
  let verifyToken: string = "";
  try {
    const jobs = await prisma.backgroundJob.findMany({
      where: { type: "SEND_VERIFICATION_EMAIL" },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    
    const job = jobs.find(j => (j.payload as any)?.userId === userIdToApprove);

    if (job) {
      // @ts-ignore
      verifyToken = job.payload.token;
      console.log("   ✅ Extracted token from BackgroundJob", verifyToken.substring(0, 20) + "...");
    } else {
      console.error("   ❌ Verification job not found");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("   ❌ Failed to extract token", err.message);
    process.exit(1);
  }

  // 7. Try to login before verifying email -> Should fail with EMAIL_NOT_VERIFIED
  console.log("\n7. Trying to login before email verification (Should fail)...");
  try {
    await myFetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });
    console.error("   ❌ Login succeeded but should have failed!");
    process.exit(1);
  } catch (err: any) {
    if (err.response?.data?.error?.code === "EMAIL_NOT_VERIFIED") {
      console.log("   ✅ Login failed as expected with EMAIL_NOT_VERIFIED");
    } else {
      console.error("   ❌ Login failed with unexpected error", err.response?.data || err.message);
      process.exit(1);
    }
  }

  // 8. Verify Email
  console.log("\n8. Verifying Email...");
  try {
    await myFetch(`${API_URL}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: verifyToken
      })
    });
    console.log("   ✅ Email verified successfully");
  } catch (err: any) {
    console.error("   ❌ Email verification failed", err.response?.data || err.message);
    process.exit(1);
  }

  // 9. Login again -> Should succeed
  console.log("\n9. Trying to login after verification (Should succeed)...");
  try {
    const loginRes = await myFetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: password
      })
    });
    console.log("   ✅ Login successful!", loginRes.data.data.user);
  } catch (err: any) {
    console.error("   ❌ Login failed", err.response?.data || err.message);
    process.exit(1);
  }

  console.log("\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

runTests();
