const jwt = require("jsonwebtoken");
const fs = require("fs");

const token = jwt.sign({ id: "admin-id", email: "vietnmf8@fullstack.edu.vn", role: "ADMIN" }, "xncgDtx6BgAa9GM6RNd6MajJC6HXfycq93RdZN3NUiw=");

async function test() {
    console.log("Fetching applications...");
    const res = await fetch("http://localhost:5000/v1/admin/applications", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (!data.data || data.data.length === 0) {
        console.log("No applications found.");
        return;
    }
    
    const app = data.data[0];
    console.log("Found application ID:", app.id);
    console.log("Current status:", app.status);
    
    console.log("Patching status to COMPLETED with template: fast_track...");
    const patchRes = await fetch(`http://localhost:5000/v1/admin/applications/${app.id}/status`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "COMPLETED", template_name: "fast_track" })
    });
    
    const patchData = await patchRes.json();
    console.log("Patch response:", patchData);
}

test();
