// 🔧 Configuração padrão ao instalar
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        mode: "MODERADO",
        sound: true
    });
});

// 📩 Listener único
chrome.runtime.onMessage.addListener((msg, sender) => {

    // 🧪 Botão de teste
    if (msg.type === "TEST_NOTIFICATION") {
        chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: "🧪 Teste OK",
            message: "Notificação funcionando corretamente",
            priority: 2
        });

        // chrome.action.setBadgeText({ text: "TEST" });
        chrome.action.setBadgeText({ text: "🔥" });
        chrome.action.setBadgeBackgroundColor({ color: "red" });

        chrome.runtime.sendMessage({ type: "PLAY_SOUND" });

        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" }); // Texto vazio remove o badge
            console.log("Badge removido após 3s");
        }, 3000);
    }


    // 🔥 Entrada detectada
    if (msg.type === "ENTRY_DETECTED") {
        chrome.notifications.create({
            type: "basic",
            title: "🔥 Entrada Detectada",
            message: `Modo: ${msg.mode}`,
            priority: 2
        });

        chrome.action.setBadgeText({ text: "🔥" });
        chrome.action.setBadgeBackgroundColor({ color: "red" });

        if (msg.sound) {
            chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
        }

        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" }); // Texto vazio remove o badge
            console.log("Badge removido após 3s");
        }, 3000);
    }
});
