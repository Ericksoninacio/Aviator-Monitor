console.log("✅ popup.js carregado");

const modeSelect = document.getElementById("mode");
const soundCheckbox = document.getElementById("sound");
const status = document.getElementById("status");
const testBtn = document.getElementById("testNotify");

// 🔄 Carregar configurações
chrome.storage.local.get(["mode", "sound"], (data) => {
    if (data.mode) modeSelect.value = data.mode;
    soundCheckbox.checked = data.sound !== false;
});

// 💾 Salvar
modeSelect.addEventListener("change", save);
soundCheckbox.addEventListener("change", save);

function save() {
    chrome.storage.local.set({
        mode: modeSelect.value,
        sound: soundCheckbox.checked
    });

    status.textContent = "✔️ Configuração salva";
    setTimeout(() => status.textContent = "", 1500);
}

// 🔊 CONTROLE DE ÁUDIO (OBRIGATÓRIO NO CHROME)
let audioUnlocked = false;
let audio;

function unlockAudio() {
    if (audioUnlocked) return;

    audio = new Audio(chrome.runtime.getURL("sounds/alert.mp3"));
    audio.volume = 1;

    audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audioUnlocked = true;
        console.log("🔊 Áudio desbloqueado");
    }).catch(() => {});
}

// qualquer clique no popup desbloqueia
document.addEventListener("click", unlockAudio);

// 🔊 Receber pedido de som
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PLAY_SOUND" && audioUnlocked && audio) {
        audio.currentTime = 0;
        audio.play();
    }
});

// 🧪 Botão de teste
testBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "TEST_NOTIFICATION" });

    status.textContent = "🔔 Notificação de teste enviada";
    setTimeout(() => status.textContent = "", 1500);
});
