console.log("✅ Aviator Monitor: Popup carregado");

const modeSelect = document.getElementById("mode");
const soundCheckbox = document.getElementById("sound");
const status = document.getElementById("status");
const testBtn = document.getElementById("testNotify");
const resultsContainer = document.getElementById("lastResults");

// ================= CONFIGURAÇÕES =================

// 🔄 Carregar configurações
chrome.storage.local.get(["mode", "sound"], (data) => {
    if (data.mode) modeSelect.value = data.mode;
    soundCheckbox.checked = data.sound !== false;
});

// 💾 Salvar ao mudar
modeSelect.addEventListener("change", save);
soundCheckbox.addEventListener("change", save);

function save() {
    chrome.storage.local.set({
        mode: modeSelect.value,
        sound: soundCheckbox.checked
    });

    status.textContent = "✔️ Configuração salva";
    status.style.color = "#38bdf8";
    setTimeout(() => status.textContent = "", 1500);
}

// ================= RESULTADOS =================

// Buscar últimos resultados ao abrir popup
chrome.runtime.sendMessage({ type: "GET_LAST_RESULTS" }, (response) => {
    renderResults(response?.results || []);
});

function renderResults(results) {
    resultsContainer.innerHTML = "";

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = `<span class="empty">Sem dados</span>`;
        return;
    }

    results.forEach(value => {
        const div = document.createElement("div");
        div.className = "result " + (value < 2 ? "low" : "high");
        div.textContent = value.toFixed(2) + "x";
        resultsContainer.appendChild(div);
    });
}

// ================= ÁUDIO =================

// 🔊 CONTROLE DE ÁUDIO
let audio = new Audio(chrome.runtime.getURL("sounds/alert.mp3"));
let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;

    audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audioUnlocked = true;
        console.log("🔊 Áudio desbloqueado com sucesso");
        status.textContent = "🔊 Áudio Ativado";
        status.style.color = "#22c55e";
        setTimeout(() => status.textContent = "", 1000);
    }).catch(err => {
        console.error("❌ Erro ao desbloquear áudio:", err);
    });
}

// Qualquer interação no popup desbloqueia o áudio
document.addEventListener("click", unlockAudio);

// 🔊 Escutar comandos de som vindos do background ou content
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "EXECUTE_SOUND") {
        chrome.storage.local.get(["sound"], (data) => {
            if (data.sound !== false) {
                if (audioUnlocked) {
                    audio.currentTime = 0;
                    audio.play().catch(e => console.error("Erro ao tocar:", e));
                } else {
                    console.warn("⚠️ Áudio ainda não desbloqueado. Clique no popup uma vez.");
                    status.textContent = "⚠️ Clique para ativar o som";
                    status.style.color = "#fbbf24";
                }
            }
        });
    }
});

// ================= ATUALIZAÇÃO EM TEMPO REAL =================
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "UPDATE_LAST_RESULTS") {
        renderResults(msg.results || []);
    }
});



// ================= TESTE =================

// 🧪 Botão de teste
testBtn.addEventListener("click", () => {
    unlockAudio(); // garante desbloqueio no clique
    chrome.runtime.sendMessage({ type: "TEST_NOTIFICATION" });
    status.textContent = "🔔 Testando alerta...";
    status.style.color = "#38bdf8";
    setTimeout(() => status.textContent = "", 1500);
});
