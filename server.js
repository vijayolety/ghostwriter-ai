import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/api/generate", async (req, res) => {
    try {
        const { prompt, tone, provider, model, apiKey } = req.body;

        if (!prompt || !apiKey) {
            return res.status(400).json({ error: "Prompt and API Key are required" });
        }

        let text = "";

        if (provider === "gemini") {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `You are an AI ghostwriter. Tone: ${tone}. Create a clear, polished first draft from this outline:\n\n${prompt}` }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || "Gemini Error");
            text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else if (provider === "xai") {
            const xai = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
            const response = await xai.chat.completions.create({
                model: model || "grok-beta",
                messages: [
                    { role: "system", content: "You are a professional ghostwriter." },
                    { role: "user", content: `Tone: ${tone}\n\nOutline:\n${prompt}` }
                ],
                temperature: 0.7,
            });
            text = response.choices[0].message.content;
        } else if (provider === "groq") {
            const groq = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
            const response = await groq.chat.completions.create({
                model: model || "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are a professional ghostwriter." },
                    { role: "user", content: `Tone: ${tone}\n\nOutline:\n${prompt}` }
                ],
                temperature: 0.7,
            });
            text = response.choices[0].message.content;
        } else {
            const openai = new OpenAI({ apiKey });
            const response = await openai.chat.completions.create({
                model: model || "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a professional ghostwriter." },
                    { role: "user", content: `Tone: ${tone}\n\nOutline:\n${prompt}` }
                ],
                temperature: 0.7,
            });
            text = response.choices[0].message.content;
        }

        res.json({ text });
    } catch (err) {
        console.error("Generation Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(5050, () => {
    console.log("Server running on http://localhost:5050");
});