// 🔧 Configuração padrão ao instalar
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        mode: "TESTE", // Alterado padrão para TESTE
        sound: true
    });
});

// 📩 Listener único para todas as mensagens
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

        chrome.action.setBadgeText({ text: "TEST" });
        chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });

        chrome.runtime.sendMessage({ type: "PLAY_SOUND" });

        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
        }, 3000);
    }

    // 🆕 Nova partida detectada
    if (msg.type === "NEW_GAME_DETECTED") {
        chrome.action.setBadgeText({ text: "🔄" });
        chrome.action.setBadgeBackgroundColor({ color: "#3b82f6" });

        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
        }, 2000);
    }

    // 🔥 Sinal de entrada detectado
    if (msg.type === "ENTRY_SIGNAL") {
        // Verificar se deve mostrar notificação do Chrome
        const showChromeNotification = msg.notificationType === "CHROME_NOTIFICATION" || 
                                       msg.notificationType === "BOTH";
        let notificationMessage = "";
        let badgeColor = "#ef4444";
        
        switch(msg.mode) {
            case "TESTE":
                notificationMessage = "Modo TESTE - Partida detectada";
                badgeColor = "#8b5cf6";
                break;
            case "AGRESSIVO":
                notificationMessage = "3 baixas consecutivas detectadas!";
                badgeColor = "#ef4444";
                break;
            case "MODERADO":
                notificationMessage = "4 baixas consecutivas detectadas!";
                badgeColor = "#f59e0b";
                break;
            case "CONSERVADOR":
                notificationMessage = "5 baixas consecutivas detectadas!";
                badgeColor = "#22c55e";
                break;
        }

        chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: `🚨 ${msg.mode}`,
            message: notificationMessage,
            priority: 2
        });

        chrome.action.setBadgeText({ text: "🔥" });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });

        if (msg.sound) {
            chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
        }

        setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
        }, 5000);
    }
});