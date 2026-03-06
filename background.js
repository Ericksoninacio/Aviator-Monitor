console.log("🌐 [Aviator Monitor PRO] v2.0 — Background Service Worker ativo.");

// ================= ESTADO GLOBAL =================
let state = {
    lastResults:      [],
    lastSaldo:        null,
    lastPadrao:       null,
    lastApostas:      null,
    lastClassificados: [],
    totalSinais:      0,
    ultimoSinal:      null,
};

// ================= INSTALAÇÃO =================
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        mode:             "CONSERVADOR",
        sound:            true,
        porcentagemBanca: 0.05,
        oddEntrada1:      1.30,
        valorMinimo:      1.00,
    });
    console.log("✅ [Aviator Monitor PRO] Instalado — configurações padrão definidas.");
});

// ================= MENSAGENS =================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // --- Análise completa enviada pelo content ---
    if (msg.type === "UPDATE_ANALYSIS") {
        state.lastResults       = msg.results      || [];
        state.lastSaldo         = msg.saldo        ?? null;
        state.lastPadrao        = msg.padrao       || null;
        state.lastApostas       = msg.apostas      || null;
        state.lastClassificados = msg.classificados || [];

        // Propaga para o popup (se aberto)
        chrome.runtime.sendMessage({ type: "ANALYSIS_UPDATE", ...state }).catch(() => {});
    }

    // --- Sinal confirmado pelo content ---
    if (msg.type === "SIGNAL_DETECTED") {
        state.totalSinais++;
        state.ultimoSinal = new Date().toLocaleTimeString("pt-BR");

        console.log(`🚀 [Aviator Monitor PRO] Sinal #${state.totalSinais}:`, msg.padrao?.nome);

        // Notificação do sistema
        const aposta1Txt = msg.apostas ? `R$ ${msg.apostas.valor1.toFixed(2)}` : "—";
        const aposta2Txt = msg.apostas ? `R$ ${msg.apostas.valor2.toFixed(2)}` : "—";

        chrome.notifications.create(`signal-${Date.now()}`, {
            type:     "basic",
            iconUrl:  "icons/icon128.png",
            title:    `🚀 ${msg.padrao?.nome || "SINAL DETECTADO"}`,
            message:  `Confiança: ${msg.padrao?.confianca}% | E1: ${aposta1Txt} | Proteção: ${aposta2Txt}`,
            priority: 2
        }, (id) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Notificação:", chrome.runtime.lastError);
            }
        });

        // Badge animado
        chrome.action.setBadgeText({ text: "●" });
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 8000);

        // Solicita som ao popup
        chrome.runtime.sendMessage({ type: "EXECUTE_SOUND" }).catch(() => {});

        // Solicita alerta visual ao content
        if (sender.tab?.id) {
            chrome.storage.local.get(["autoEntrar"], ({ autoEntrar }) => {
                chrome.tabs.sendMessage(sender.tab.id, {
                    type:       "SHOW_VISUAL_ALERT",
                    padrao:     msg.padrao,
                    apostas:    msg.apostas,
                    autoEntrar: autoEntrar === true
                }).catch(() => {});
            });
        }

        // Atualiza popup
        chrome.runtime.sendMessage({ type: "ANALYSIS_UPDATE", ...state }).catch(() => {});
    }

    // --- Popup pede estado atual ---
    if (msg.type === "GET_STATE") {
        sendResponse({ ok: true, ...state });
    }

    // --- Liga/desliga geral → repassa ao content ---
    if (msg.type === "SET_MONITOR") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "SET_MONITOR", ativo: msg.ativo }).catch(() => {});
            });
        });
    }

    // --- Padrões atualizados pelo popup → repassa ao content ---
    if (msg.type === "PADROES_UPDATED") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: "PADROES_UPDATED",
                    padroes: msg.padroes
                }).catch(() => {});
            });
        });
    }

    // --- Teste manual ---
    if (msg.type === "TEST_NOTIFICATION") {
        chrome.notifications.create({
            type:     "basic",
            iconUrl:  "icons/icon128.png",
            title:    "🧪 Teste — Aviator Monitor PRO",
            message:  "Sistema de alertas funcionando corretamente.",
            priority: 2
        });
        chrome.runtime.sendMessage({ type: "EXECUTE_SOUND" }).catch(() => {});
    }

    return true;
});