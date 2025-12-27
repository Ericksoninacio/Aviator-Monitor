console.log("🛫 [Aviator Monitor PRO] Monitoramento de Avisos Nativos Ativo");

let currentConfig = {
    mode: "TESTE",
    sound: true
};

// ================= CONFIGURAÇÕES =================
chrome.storage.local.get(["mode", "sound"], (data) => {
    if (data.mode) currentConfig.mode = data.mode;
    if (typeof data.sound === "boolean") currentConfig.sound = data.sound;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.mode) currentConfig.mode = changes.mode.newValue;
    if (changes.sound) currentConfig.sound = changes.sound.newValue;
});

// ================= ALERTA VISUAL =================
function triggerAlert(message = "Oportunidade Detectada!") {
    console.log("🚨 [Aviator Monitor] GATILHO DISPARADO:", message);

    if (currentConfig.sound) {
        chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
    }

    const notifyDiv = document.createElement("div");
    notifyDiv.innerHTML = `
        <div style="background:#0f172a;color:white;padding:20px;border-radius:12px;
            border:2px solid #38bdf8;box-shadow:0 10px 25px rgba(0,0,0,.5);
            font-family:sans-serif;min-width:300px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <strong style="color:#38bdf8;font-size:18px;">🚀 AVISO DETECTADO</strong>
                <span style="cursor:pointer;font-weight:bold"
                      onclick="this.closest('div').parentElement.remove()">✕</span>
            </div>
            <div style="font-size:14px;margin-bottom:10px;">${message}</div>
            <div style="background:rgba(56,189,248,.1);padding:10px;border-radius:8px;
                        font-size:12px;border-left:4px solid #38bdf8;">
                🎯 <strong>Ação:</strong> Verifique a mesa para entrada
            </div>
        </div>
    `;

    Object.assign(notifyDiv.style, {
        position: "fixed",
        top: "25px",
        right: "25px",
        zIndex: "2147483647",
        animation: "slideIn .4s ease-out"
    });

    if (!document.getElementById("aviator-monitor-style")) {
        const style = document.createElement("style");
        style.id = "aviator-monitor-style";
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);   opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notifyDiv);
    setTimeout(() => notifyDiv.remove(), 8000);
}

// ================= LEITURA DOS RESULTADOS =================
function getLastResults() {
    try {
        const results = [];
        const payoutsBlock = document.querySelector(".payouts-block");
        if (!payoutsBlock) return [];

        const items = payoutsBlock.querySelectorAll(".payout");
        items.forEach(el => {
            const text = el.textContent.trim();
            if (text.endsWith("x")) {
                const value = parseFloat(text.replace("x", "").replace(",", "."));
                if (!isNaN(value)) results.push(value);
            }
        });

        // mais recente primeiro
        return results.slice(0, 4);
    } catch (e) {
        console.error("Erro ao capturar resultados:", e);
        return [];
    }
}

// ================= ENVIO PARA O POPUP =================
let lastSent = "";

function sendResultsToBackground() {
    const last4 = getLastResults();
    if (last4.length === 0) return;

    const signature = last4.join("-");
    if (signature === lastSent) return;

    lastSent = signature;

    chrome.runtime.sendMessage({
        type: "UPDATE_LAST_RESULTS",
        results: last4
    });

    console.log("📤 [Aviator Monitor] Últimos 4 enviados:", last4);
}

// ================= OBSERVADOR PRINCIPAL =================
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    const text = node.innerText || "";

                    const isAlert =
                        node.classList.contains("app-alert") ||
                        node.classList.contains("modal-content") ||
                        node.classList.contains("alert-container") ||
                        node.querySelector(".alert-message") ||
                        text.includes("FAÇA SUA APOSTA") ||
                        text.includes("ESPERANDO PRÓXIMA RODADA");

                    if (isAlert) {
                        console.log("🔍 Aviso detectado:", text);

                        // Atualiza resultados sempre que muda rodada
                        sendResultsToBackground();

                        if (currentConfig.mode === "TESTE") {
                            triggerAlert("Aviso da página: " + text);
                        } else if (text.includes("FAÇA SUA APOSTA")) {
                            triggerAlert("Momento de Entrada Detectado!");
                        }
                    }
                }
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// ================= FALLBACK TEXTO =================
let lastAlertTime = 0;

const textObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const txt = mutation.target.textContent || "";
        if (txt.includes("FAÇA SUA APOSTA") || txt.includes("ESPERANDO")) {
            if (Date.now() - lastAlertTime > 5000) {
                lastAlertTime = Date.now();
                sendResultsToBackground();
                triggerAlert("Sinal detectado: " + txt);
            }
        }
    }
});

textObserver.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true
});

// ================= PING INICIAL =================
setTimeout(sendResultsToBackground, 3000);

// ================= ATUALIZAÇÃO CONTÍNUA =================
// Garante atualização mesmo se não houver mutação visível
setInterval(() => {
    sendResultsToBackground();
}, 1500); // 1.5s é seguro e leve
