const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Desteklenen Yapay Zeka Modelleri
const MODELS = {
    'gemini': 'google/gemini-2.5-flash',
    'claude': 'anthropic/claude-3.5-sonnet',
    'gpt4': 'openai/gpt-4o',
    'deepseek': 'deepseek/deepseek-chat'
};

// Ana Sayfa Sağlık Kontrolü
app.get('/', (req, res) => {
    res.send("YuPPie AI Backend v2.0 Aktif ve Çalışıyor!");
});

// Script Üretme Endpoint'i
app.post('/generate-script', async (req, res) => {
    try {
        const { prompt, provider = 'gemini', userKey } = req.body;
        
        // API Key: Önce kullanıcının eklentide girdiği key, yoksa Render'daki anahtar kullanılır
        const apiKey = userKey && userKey.trim() !== "" ? userKey : process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: "API Anahtarı bulunamadı! Render paneline OPENROUTER_API_KEY ekleyin veya eklentiden girin." 
            });
        }

        const selectedModel = MODELS[provider] || MODELS['gemini'];

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://yuppie-ai.onrender.com",
                "X-Title": "YuPPie AI Studio"
            },
            body: JSON.stringify({
                "model": selectedModel,
                "messages": [
                    {
                        "role": "system",
                        "content": "Sen Roblox Studio için uzman bir Luau geliştiricisisin. Sadece ve sadece kopyalanıp doğrudan çalıştırılabilir Luau kod blokları döndür. Açıklama, selamlaşma veya markdown dışında metin yazma."
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
            throw new Error(data.error?.message || "AI yanıt vermedi.");
        }

        let rawCode = data.choices[0].message.content;
        let cleanCode = rawCode.replace(/```lua/g, '').replace(/```/g, '').trim();

        res.json({ success: true, code: cleanCode, usedModel: selectedModel });
    } catch (error) {
        console.error("Hata:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`YuPPie AI Server ${PORT} portunda aktif!`));