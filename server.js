const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Yapay Zeka Modelleri Haritası
const MODELS = {
    'gemini': 'google/gemini-2.5-flash',
    'claude': 'anthropic/claude-3.5-sonnet',
    'gpt4': 'openai/gpt-4o',
    'deepseek': 'deepseek/deepseek-chat'
};

// Eşleştirme Kodlarını Saklama Alanı (Geçici Hafıza)
const syncCodes = new Map();
const activeTokens = new Map();

// 1. Ana Sayfa Kontrolü
app.get('/', (req, res) => {
    res.send("YuPPie AI Multi-Server v3.0 Aktif ve Çalışıyor!");
});

// 2. Web Siteden Eşleştirme Kodu Üretme (/api/create-code)
app.post('/api/create-code', (req, res) => {
    try {
        const code = "YP-" + Math.floor(100000 + Math.random() * 900000);
        
        // Kodu 5 dakikalık geçerlilik süresiyle hafızaya kaydet
        syncCodes.set(code, {
            createdAt: Date.now()
        });

        // 5 dakika sonra otomatik sil
        setTimeout(() => syncCodes.delete(code), 5 * 60 * 1000);

        console.log(`[YuPPie Sync] Yeni kod üretildi: ${code}`);
        res.json({ success: true, code: code });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Studio Plugin'den Kodu Doğrulama (/api/verify-code)
app.post('/api/verify-code', (req, res) => {
    try {
        const { code } = req.body;
        const sessionData = syncCodes.get(code);

        if (!sessionData) {
            return res.status(400).json({ success: false, error: "Geçersiz veya süresi dolmuş kod!" });
        }

        // Kullanıcıya özel benzersiz token oluştur
        const token = "YP_TOKEN_" + Math.random().toString(36).substring(2) + Date.now();
        activeTokens.set(token, true);

        // Kullanılan tek seferlik kodu sil
        syncCodes.delete(code);

        console.log(`[YuPPie Sync] Kod doğrulandı, Token oluşturuldu: ${token}`);
        res.json({ success: true, token: token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Script Üretme Endpoint'i (/generate-script)
app.post('/generate-script', async (req, res) => {
    try {
        const { prompt, provider = 'gemini', userKey } = req.body;

        // Render Panelindeki Ana API Key'i alır
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(400).json({ 
                success: false, 
                error: "Render üzerinde OPENROUTER_API_KEY tanımlı değil!" 
            });
        }

        const selectedModel = MODELS[provider] || MODELS['gemini'];

        console.log(`[YuPPie AI] İstek işleniyor. Model: ${selectedModel}`);

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
        console.error("Hata:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`YuPPie AI Server v3.0 ${PORT} portunda aktif!`));
