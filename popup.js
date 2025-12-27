document.addEventListener('DOMContentLoaded', () => {
    const modeSelect = document.getElementById('mode');
    const soundCheckbox = document.getElementById('sound');
    const testButton = document.getElementById('testNotify');
    const statusDiv = document.getElementById('status');

    // Carregar configurações
    chrome.storage.local.get(['mode', 'sound'], (data) => {
        if (data.mode) modeSelect.value = data.mode;
        if (typeof data.sound === 'boolean') soundCheckbox.checked = data.sound;
    });

    // Salvar modo
    modeSelect.addEventListener('change', () => {
        const mode = modeSelect.value;
        chrome.storage.local.set({ mode: mode });
        showStatus(`Modo: ${modeSelect.options[modeSelect.selectedIndex].text}`);
    });

    // Salvar som
    soundCheckbox.addEventListener('change', () => {
        chrome.storage.local.set({ sound: soundCheckbox.checked });
        showStatus(`Som ${soundCheckbox.checked ? 'ON' : 'OFF'}`);
    });

    // Teste
    testButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "TEST_NOTIFICATION" });
        showStatus("Teste enviado");
    });

    // Função auxiliar
    function showStatus(text) {
        statusDiv.textContent = text;
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 2000);
    }
});
