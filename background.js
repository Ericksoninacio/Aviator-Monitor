console.log("🌐 [Aviator Monitor] Background Service Worker ativo.");

// ================= ESTADO GLOBAL =================
let lastResults = [];

// ================= INSTALAÇÃO =================
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ mode: "TESTE", sound: true });
    console.log("✅ [Aviator Monitor] Extensão instalada e config inicial definida.");
});

// ================= MENSAGENS =================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("📩 [Aviator Monitor] Mensagem recebida no background:", msg.type);

    // ================= SOM + ALERTA =================
    if (msg.type === "PLAY_SOUND") {

        // 1️⃣ Notificação do sistema
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "🚀 Oportunidade Aviator",
            message: "Nova entrada confirmada! Verifique a mesa.",
            priority: 2
        }, (id) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Erro ao criar notificação:", chrome.runtime.lastError);
            } else {
                console.log("🔔 Notificação enviada com sucesso, ID:", id);
            }
        });

        // 2️⃣ Badge no ícone
        chrome.action.setBadgeText({ text: "🔥" });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });

        // 3️⃣ Solicita execução de som (popup/content)
        chrome.runtime.sendMessage({ type: "EXECUTE_SOUND" });

        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
        }, 7000);
    }

    // ================= TESTE =================
    if (msg.type === "TEST_NOTIFICATION") {
        console.log("🧪 Executando teste de notificação...");
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "🧪 Teste de Alerta",
            message: "Se você está vendo isso, as notificações estão OK!",
            priority: 2
        });
        chrome.runtime.sendMessage({ type: "EXECUTE_SOUND" });
    }

    // ================= RECEBE RESULTADOS DO CONTENT =================
    if (msg.type === "UPDATE_LAST_RESULTS") {
        if (Array.isArray(msg.results)) {
            lastResults = msg.results;
            console.log("📊 [Aviator Monitor] Últimos resultados atualizados:", lastResults);
            
            chrome.runtime.sendMessage({
            type: "UPDATE_LAST_RESULTS",
            results: lastResults
        });
        
        }
    }

    // ================= POPUP PEDE RESULTADOS =================
    if (msg.type === "GET_LAST_RESULTS") {
        sendResponse({ results: lastResults });
    }

    return true; // mantém canal aberto
});
