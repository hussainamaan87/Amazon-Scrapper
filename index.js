require("dotenv").config();
const express = require("express");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function getAISummary(text) {
    try {
        const prompt = `Summarize the following product details in a short and engaging way:\n\n${text}`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("❌ Error generating AI summary:", error);
        return "AI summary not available.";
    }
}

async function scrapeAmazonProduct(url) {
    // const browser = await puppeteer.launch({ headless: true });
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/opt/render/.cache/puppeteer/chrome/linux-134.0.6998.35/chrome-linux64/chrome',
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-software-rasterizer",
          "--single-process"
        ]
    });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        const productName = await page.$eval("#productTitle", el => el.textContent.trim());
        const ratingElement = await page.$(".a-icon-star span");
        const rating = ratingElement ? await page.evaluate(el => el.textContent.trim(), ratingElement) : "No rating available";
        const numRatingsElement = await page.$("#acrCustomerReviewText");
        const numRatings = numRatingsElement ? await page.evaluate(el => el.textContent.trim(), numRatingsElement) : "No ratings count available";
        const priceElement = await page.$(".a-price-whole");
        const price = priceElement ? await page.evaluate(el => el.textContent.trim(), priceElement) : "No price available";
        const discount = await page.$eval(".priceBlockSavingsString", el => el.textContent.trim()).catch(() => "No discount available");
        const bankOffers = await page.$$eval(".a-expander-content .a-text-bold", elements => elements.map(el => el.textContent.trim()).join("\n") || "No bank offers found");
        const aboutThisItemElement = await page.$("#feature-bullets");
        const aboutThisItem = aboutThisItemElement ? await page.evaluate(el => el.innerText.trim(), aboutThisItemElement) : "No details found";
        const productInfoElement = await page.$("#productDetails_techSpec_section_1");
        const productInfo = productInfoElement ? await page.evaluate(el => el.innerText.trim(), productInfoElement) : "No technical details found";
        const images = await page.$$eval("#altImages img", imgs => imgs.map(img => img.src));
        const reviewsElement = await page.$("#customerReviews");
        const customerReviews = reviewsElement ? await page.evaluate(el => el.innerText.trim(), reviewsElement) : "No reviews found";

        // Generate AI Summary
        const textToSummarize = `Product Name: ${productName}\nRating: ${rating}\nPrice: ${price}\nDiscount: ${discount}\nDetails: ${aboutThisItem}`;
        const aiSummary = await getAISummary(textToSummarize);

        await browser.close();

        return {
            productName,
            rating,
            numRatings,
            price,
            discount,
            bankOffers,
            aboutThisItem,
            productInfo,
            images,
            customerReviews,
            aiSummary
        };

    } catch (error) {
        console.error("❌ Error scraping data:", error);
        await browser.close();
        throw new Error("Failed to scrape product data.");
    }
}

// API Route
app.get("/", async(req,res)=>{
    return res.json({message:"Hii"})
})
app.get("/scrape", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
        const productData = await scrapeAmazonProduct(url);
        res.json(productData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});