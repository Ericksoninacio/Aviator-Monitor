console.log("🛫 Aviator Monitor ativo");

let currentConfig = {
    mode: "MODERADO",
    sound: true
};

chrome.storage.local.get(["mode", "sound"], (data) => {
    if (data.mode) currentConfig.mode = data.mode;
    if (typeof data.sound === "boolean") currentConfig.sound = data.sound;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.mode) currentConfig.mode = changes.mode.newValue;
    if (changes.sound) currentConfig.sound = changes.sound.newValue;
});


// 🎯 Simulação de identificação de entrada
function detectEntry() {
    console.log(`🎯 Entrada detectada | Modo: ${currentConfig.mode}`);

    if (currentConfig.sound) {
        chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
    }

    alert(`🔥 ENTRADA ${currentConfig.mode} DETECTADA`);
}


// ⏱️ Loop de monitoramento (exemplo)
setInterval(() => {
    // Aqui entra sua lógica REAL de análise
    const chance = Math.random();

    if (
        (currentConfig.mode === "CONSERVADOR" && chance > 0.97) ||
        (currentConfig.mode === "MODERADO" && chance > 0.94) ||
        (currentConfig.mode === "AGRESSIVO" && chance > 0.90)
    ) {
        detectEntry();
    }
}, 5000);

chrome.runtime.sendMessage({
    type: "ENTRY_DETECTED",
    mode: currentConfig.mode
});
