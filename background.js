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
    notifTabMap:      {},
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

// ================= AUTO REFRESH =================
const ALARM_NAME = "autoRefreshAlarm";

// Ao iniciar o service worker, reconfigura o alarme conforme o storage
chrome.storage.local.get(["autoRefresh", "refreshInterval"], ({ autoRefresh, refreshInterval }) => {
    configurarAlarme(autoRefresh === true, refreshInterval || 30);
});

// Escuta mudanças no storage (quando o popup salva as configurações)
chrome.storage.onChanged.addListener((changes) => {
    const novoRefresh   = changes.autoRefresh?.newValue;
    const novoIntervalo = changes.refreshInterval?.newValue;

    if (novoRefresh !== undefined || novoIntervalo !== undefined) {
        chrome.storage.local.get(["autoRefresh", "refreshInterval"], ({ autoRefresh, refreshInterval }) => {
            configurarAlarme(autoRefresh === true, refreshInterval || 30);
        });
    }
});

function configurarAlarme(ativo, intervalMinutos) {
    chrome.alarms.clear(ALARM_NAME, () => {
        if (!ativo) {
            console.log("⏹ [AutoRefresh] Desativado.");
            chrome.storage.local.remove("refreshNextAt");
            return;
        }
        chrome.alarms.create(ALARM_NAME, {
            delayInMinutes:   intervalMinutos,
            periodInMinutes:  intervalMinutos,
        });
        const nextAt = Date.now() + intervalMinutos * 60 * 1000;
        chrome.storage.local.set({ refreshNextAt: nextAt });
        console.log(`⏱ [AutoRefresh] Alarme criado — a cada ${intervalMinutos} min.`);
    });
}

// Quando o alarme disparar, recarrega a aba do jogo
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM_NAME) return;

    console.log("🔄 [AutoRefresh] Recarregando aba do jogo...");

    // Atualiza próximo horário no storage (para o countdown no popup)
    chrome.storage.local.get(["refreshInterval"], ({ refreshInterval }) => {
        const nextAt = Date.now() + (refreshInterval || 30) * 60 * 1000;
        chrome.storage.local.set({ refreshNextAt: nextAt });
    });

    // Recarrega todas as abas que o content.js monitora (conforme manifest.json)
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (!tab.url) return;
            const url = tab.url.toLowerCase();
            if (
                url.includes("superbet.bet.br") ||
                url.includes("luck.bet.br")    ||
                url.includes("spribegaming.com")
            ) {
                chrome.tabs.reload(tab.id, { bypassCache: true }, () => {
                    console.log(`✅ [AutoRefresh] Aba recarregada: ${tab.url}`);
                });
            }
        });
    });

    // Notifica o popup para atualizar o countdown
    chrome.runtime.sendMessage({ type: "REFRESH_EXECUTED" }).catch(() => {});
});

// ── Clique na notificação: foca aba do jogo e fecha ──
chrome.notifications.onClicked.addListener((notifId) => {
    chrome.notifications.clear(notifId, () => {});
    const target = state.notifTabMap[notifId];
    if (!target) return;
    delete state.notifTabMap[notifId];
    chrome.windows.update(target.windowId, { focused: true }, () => {
        chrome.tabs.update(target.tabId, { active: true });
    });
});

chrome.notifications.onClosed.addListener((notifId) => {
    delete state.notifTabMap[notifId];
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

        const originTabId    = sender.tab?.id;
        const originWindowId = sender.tab?.windowId;
        const notifId        = `signal-${Date.now()}`;

        chrome.notifications.create(notifId, {
            type:               "basic",
            iconUrl:            "icons/icon128.png",
            title:              `🚀 ${msg.padrao?.nome || "SINAL DETECTADO"}`,
            message:            `Confiança: ${msg.padrao?.confianca}% | E1: ${aposta1Txt} | Proteção: ${aposta2Txt}`,
            priority:           2,
            requireInteraction: false
        }, (id) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Notificação:", chrome.runtime.lastError);
                return;
            }
            // Fecha automaticamente após 6s
            setTimeout(() => chrome.notifications.clear(id, () => {}), 6000);
            // Guarda tab de origem para focar ao clicar
            if (originTabId) state.notifTabMap[id] = { tabId: originTabId, windowId: originWindowId };
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

    // --- Stop Loss / Gain acionado pelo content ---
    if (msg.type === "STOP_TRIGGERED") {
        const emoji  = msg.motivo === "STOP_LOSS" ? "🛑" : "🏆";
        const titulo = msg.motivo === "STOP_LOSS" ? "Stop Loss atingido" : "Stop Gain atingido";
        const sinal  = msg.pct > 0 ? `+${msg.pct}` : msg.pct;

        chrome.notifications.create(`stop-${Date.now()}`, {
            type:               "basic",
            iconUrl:            "icons/icon128.png",
            title:              `${emoji} ${titulo}`,
            message:            `Variação: ${sinal}% | Saldo atual: R$ ${parseFloat(msg.saldo).toFixed(2)} | Monitor desligado.`,
            priority:           2,
            requireInteraction: true   // fica até o usuário fechar
        });

        // Atualiza estado
        state.lastPadrao = null;
        chrome.storage.local.set({ monitorAtivo: false });

        // Notifica popup para atualizar o botão power
        chrome.runtime.sendMessage({ type: "SET_MONITOR", ativo: false }).catch(() => {});
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