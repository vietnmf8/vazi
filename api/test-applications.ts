import { listAdminApplications } from "./src/services/admin/applications.admin.service";

async function runTest() {
    console.log("=== Testing Pagination ===");
    const res1 = await listAdminApplications({ page: 1, limit: 2 });
    console.log("Page 1 (Limit 2):", res1.rows.length, "Total:", res1.total);

    console.log("\n=== Testing Search ===");
    const res2 = await listAdminApplications({ page: 1, limit: 5, search: "a" });
    console.log("Search 'a':", res2.rows.length, "Total:", res2.total);

    console.log("\n=== Testing Filter by Status ===");
    const res3 = await listAdminApplications({ page: 1, limit: 5, status: "PAID" });
    console.log("Filter PAID:", res3.rows.map(r => r.status));

    console.log("\n=== Testing Filter by Date ===");
    const res4 = await listAdminApplications({ page: 1, limit: 5, date: "2024-01-01" });
    console.log("Filter Date 2024-01-01:", res4.rows.length);

    console.log("\n=== Testing Sort by total_amount DESC ===");
    const res5 = await listAdminApplications({ page: 1, limit: 5, sort_by: "total_amount", sort_dir: "desc" });
    console.log("Sort total_amount desc:", res5.rows.map(r => r.total_amount));

    console.log("\n=== Testing Sort by application_code ASC ===");
    const res6 = await listAdminApplications({ page: 1, limit: 5, sort_by: "application_code", sort_dir: "asc" });
    console.log("Sort application_code asc:", res6.rows.map(r => r.application_code));

    console.log("\n=== Testing Sort by contact_email DESC ===");
    const res7 = await listAdminApplications({ page: 1, limit: 5, sort_by: "contact_email", sort_dir: "desc" });
    console.log("Sort contact_email desc:", res7.rows.map(r => r.contact_email));
}

runTest().catch(console.error).finally(() => process.exit(0));
