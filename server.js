const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const MODELS = {
    'gemini': 'google/gemini-2.5-flash',
    'claude': 'anthropic/claude-3.5-sonnet',
    'gpt4': 'openai/gpt-4o',
    'deepseek': 'deepseek/deepseek-chat'
};

const syncCodes = new Map();
const activeTokens = new Map();
const taskQueue = new Map();

app.get('/', (req, res) => {
    res.send("YuPPie AI Multi-Server v3.0 Aktif ve Çalışıyor!");
});

app.post('/api/create-code', (req, res) => {
    try {
        const code = "YP-" + Math.floor(100000 + Math.random() * 900000);
        syncCodes.set(code, { createdAt: Date.now() });
        setTimeout(() => syncCodes.delete(code), 5 * 60 * 1000);
        res.json({ success: true, code: code });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/verify-code', (req, res) => {
    try {
        const { code } = req.body;
        const sessionData = syncCodes.get(code);
        if (!sessionData) {
            return res.status(400).json({ success: false, error: "Geçersiz veya süresi dolmuş kod!" });
        }
        const token = "YP_TOKEN_" + Math.random().toString(36).substring(2) + Date.now();
        activeTokens.set(token, true);
        syncCodes.delete(code);
        res.json({ success: true, token: token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/send-task', (req, res) => {
    try {
        const { token, prompt, model, apiKey } = req.body;
        if (!token || !activeTokens.has(token)) {
            return res.status(401).json({ success: false, error: "Geçersiz veya eşleşmemiş token!" });
        }
        taskQueue.set(token, { prompt, model: model || 'gemini', apiKey, status: 'pending' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/fetch-task', (req, res) => {
    try {
        const { token } = req.body;
        if (taskQueue.has(token)) {
            const task = taskQueue.get(token);
            taskQueue.delete(token);
            res.json({ success: true, task: task });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/generate-script', async (req, res) => {
    try {
        const { prompt, provider = 'gemini', userKey } = req.body;
        const apiKey = userKey || process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(400).json({ success: false, error: "API Key tanımlı değil!" });
        }

        const selectedModel = MODELS[provider] || MODELS['gemini'];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://yuppie-ai-backend.onrender.com",
                "X-Title": "YuPPie AI Studio"
            },
            body: JSON.stringify({
                "model": selectedModel,
                "messages": [
                    {
                        "role": "system",
                        "content": "Sen Roblox Studio için uzman bir Luau geliştiricisisin. SADECE doğrudan kopyalanıp çalıştırılabilir Luau kod blokları döndür. Açıklama, selamlaşma veya metin yazma."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok || !data.choices || !data.choices[0]) {
            throw new Error(data.error?.message || "Yapay zeka yanıt veremedi.");
        }

        let rawCode = data.choices[0].message.content;
        let cleanCode = rawCode.replace(/```lua/g, '').replace(/```/g, '').trim();

        res.json({ success: true, code: cleanCode, usedModel: selectedModel });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`YuPPie AI Server v3.0 ${PORT} portunda aktif!`));
