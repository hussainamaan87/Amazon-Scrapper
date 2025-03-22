require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generateAIResponse() {
    try {
        const prompt = "Explain how AI works in a few words";
        const result = await model.generateContent(prompt);
        console.log(result.response.text());
    } catch (error) {
        console.error("❌ Error generating AI response:", error);
    }
}

generateAIResponse();