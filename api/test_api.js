const http = require('http');

async function testApi() {
    try {
        const body = JSON.stringify({
            step1: {
                visa_type: "evisa",
                visa_category: "code_fasttrack",
                processing_time: "urgent_1d",
                applicant_count: 1,
                arrival_date: "2026-10-10",
                port_of_entry: "SGN",
                purpose_of_visit: "TOURISM",
                vip_fast_track: false,
                basic_fast_track: true
            },
            step2: {
                applicants: [
                    {
                        full_name: "TEST E2E NODE",
                        gender: "male",
                        nationality: "US",
                        date_of_birth: "1990-01-01",
                        passport_number: "P1234567",
                        passport_expiry_date: "2030-01-01",
                        passport_image: "test_passport_public_id",
                        portrait_image: "test_portrait_public_id",
                        flight_ticket: "test_flight_public_id"
                    }
                ],
                email: "test_curl@fastvisa.com",
                phone: "1234567890"
            }
        });

        console.log("Submitting application...");
        const res = await fetch("http://localhost:5000/api/v1/applications/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: body
        });
        
        const data = await res.json();
        console.log("Response:", data);
        
        if (data.data && data.data.id) {
            console.log("Created Application ID:", data.data.id);
            // Wait, we need an admin token. I'll login as admin via API.
            console.log("Logging in as admin...");
            const loginRes = await fetch("http://localhost:5000/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: "admin@test.com", password: "password" })
            });
            const loginData = await loginRes.json();
            console.log("Login Response:", loginData);
            
            // If admin doesn't exist, we can't easily do it via API without setting it up.
            // Let's assume there is an admin token.
        }

    } catch (e) {
        console.error(e);
    }
}

testApi();
