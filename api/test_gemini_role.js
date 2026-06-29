const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

async function run(role) {
    try {
        const contents = [
            { role: "user", parts: [{text: "Hi"}] },
            { role: "model", parts: [{functionCall: {name: "test", args: {}}}] },
            { role: role, parts: [{functionResponse: {name: "test", response: {ok: true}}}] }
        ];
        const res = await model.generateContent({ contents });
        console.log("Success with role:", role);
    } catch(e) {
        console.log("Error with role:", role, e.message);
    }
}

async function main() {
    await run("function");
    await run("user");
}
main();
