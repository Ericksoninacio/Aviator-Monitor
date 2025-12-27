console.log("🛫 Aviator Monitor v1.2 ativo");

// Configurações atuais
let currentConfig = {
    mode: "TESTE",
    sound: true,
    notificationType: "PAGE_ALERT"
};

// Estado do monitor
let gameHistory = [];
let isMonitoring = true;
let lastProcessedGame = null;
let alertOverlay = null;
let historyIndicator = null;

// Carregar configurações iniciais
chrome.storage.local.get(["mode", "sound", "notificationType"], (data) => {
    if (data.mode) currentConfig.mode = data.mode;
    if (typeof data.sound === "boolean") currentConfig.sound = data.sound;
    if (data.notificationType) currentConfig.notificationType = data.notificationType;
    console.log(`Modo configurado: ${currentConfig.mode} | Notificação: ${currentConfig.notificationType}`);
});

// Ouvir mudanças nas configurações
chrome.storage.onChanged.addListener((changes) => {
    if (changes.mode) currentConfig.mode = changes.mode.newValue;
    if (changes.sound) currentConfig.sound = changes.sound.newValue;
    if (changes.notificationType) currentConfig.notificationType = changes.notificationType.newValue;
});

// ========== SISTEMA DE ALERTAS NA PÁGINA ==========

// Criar overlay discreto para alertas
function createAlertOverlay() {
    if (alertOverlay) return alertOverlay;
    
    const overlay = document.createElement('div');
    overlay.id = 'aviator-monitor-alert';
    overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: none;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    `;
    
    document.body.appendChild(overlay);
    alertOverlay = overlay;
    return overlay;
}

// Criar ou obter indicador de histórico
function getOrCreateHistoryIndicator() {
    if (!historyIndicator) {
        historyIndicator = document.querySelector('#aviator-history-indicator');
        
        if (!historyIndicator) {
            historyIndicator = document.createElement('div');
            historyIndicator.id = 'aviator-history-indicator';
            historyIndicator.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 10px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                z-index: 999997;
                opacity: 0.7;
                display: none;
            `;
            document.body.appendChild(historyIndicator);
        }
    }
    return historyIndicator;
}

// Mostrar alerta na página (não-invasivo)
function showPageAlert(title, message, type = 'info', duration = 5000) {
    const overlay = createAlertOverlay();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'aviator-alert';
    alertDiv.style.cssText = `
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        animation: slideIn 0.3s ease;
        font-family: Arial, sans-serif;
        font-size: 14px;
        opacity: 0.95;
        backdrop-filter: blur(10px);
        border-left: 4px solid ${type === 'success' ? '#059669' : type === 'warning' ? '#d97706' : '#dc2626'};
    `;
    
    alertDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
            ${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🚨'} ${title}
        </div>
        <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;
    
    // Adicionar estilo de animação
    if (!document.querySelector('#aviator-alert-styles')) {
        const style = document.createElement('style');
        style.id = 'aviator-alert-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 0.95; }
            }
            @keyframes fadeOut {
                from { opacity: 0.95; }
                to { opacity: 0; }
            }
            .aviator-alert.fade-out {
                animation: fadeOut 0.5s ease forwards;
            }
        `;
        document.head.appendChild(style);
    }
    
    overlay.appendChild(alertDiv);
    overlay.style.display = 'flex';
    
    // Remover após duração
    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
            if (overlay.children.length === 0) {
                overlay.style.display = 'none';
            }
        }, 500);
    }, duration);
    
    return alertDiv;
}

// Mostrar badge discreto na tela
function showScreenBadge(text, color = '#ef4444', duration = 3000) {
    let badge = document.querySelector('#aviator-screen-badge');
    
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'aviator-screen-badge';
        badge.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: ${color};
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            z-index: 999998;
            opacity: 0.8;
            animation: pulse 2s infinite;
            pointer-events: none;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.8; transform: translateY(-50%) scale(1); }
                50% { opacity: 1; transform: translateY(-50%) scale(1.05); }
                100% { opacity: 0.8; transform: translateY(-50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(badge);
    }
    
    badge.textContent = text;
    badge.style.background = color;
    
    // Remover após duração
    if (duration > 0) {
        setTimeout(() => {
            if (badge && badge.parentNode) {
                badge.parentNode.removeChild(badge);
            }
        }, duration);
    }
    
    return badge;
}

// ========== LÓGICA DE ANÁLISE ==========

// Função para extrair resultados do histórico - USANDO A MESMA LÓGICA DO PYTHON
function extractGameResults() {
    const results = [];
    
    try {
        // STRATEGY 1: Buscar pelo texto completo do histórico (como no Python)
        console.log("🔍 Tentando estratégia 1: Buscar texto do histórico...");
        
        // Tentar encontrar elemento com texto de resultados
        const allElements = document.querySelectorAll('*');
        let historyElement = null;
        
        for (const element of allElements) {
            const text = element.textContent.trim();
            // Procurar por padrão de múltiplos números com 'x'
            if (text.includes('x') && text.split('x').length > 3) {
                // Verificar se tem vários números com 'x'
                const lines = text.split('\n').filter(line => line.includes('x'));
                if (lines.length >= 3) {
                    historyElement = element;
                    //console.log("Elemento de histórico encontrado:", element);
                    break;
                }
            }
        }
        
        if (historyElement) {
            const text = historyElement.textContent.trim();
            console.log("Texto do histórico:", text);
            
            // Extrair todos os números com 'x' (como no Python)
            const matches = text.match(/[\d.]+x/g);
            
            if (matches) {
                matches.forEach(match => {
                    const multiplierText = match.replace('x', '').replace(',', '.').trim();
                    const multiplier = parseFloat(multiplierText);
                    
                    if (!isNaN(multiplier) && multiplier > 0) {
                        const isLow = multiplier < 2.00;
                        const isMedium = multiplier >= 2.00 && multiplier < 10.00;
                        const isHigh = multiplier >= 10.00;
                        
                        results.push({
                            multiplier: multiplier,
                            isLow: isLow,
                            isMedium: isMedium,
                            isHigh: isHigh,
                            rawText: match
                        });
                    }
                });
            }
        }
        
        // STRATEGY 2: Buscar elementos individuais (backup)
        if (results.length === 0) {
            console.log("🔍 Tentando estratégia 2: Buscar elementos individuais...");
            
            // Procurar por elementos com números e 'x'
            const elementsWithX = document.querySelectorAll('*');
            elementsWithX.forEach(element => {
                const text = element.textContent.trim();
                if (text.includes('x') && !text.includes(' ') && text.length < 10) {
                    const multiplierText = text.replace('x', '').replace(',', '.').trim();
                    const multiplier = parseFloat(multiplierText);
                    
                    if (!isNaN(multiplier) && multiplier > 0) {
                        const isLow = multiplier < 2.00;
                        results.push({
                            multiplier: multiplier,
                            isLow: isLow,
                            rawText: text
                        });
                    }
                }
            });
        }
        
        // Inverter para ter os mais recentes primeiro
        const reversedResults = results.reverse();
        //console.log(`📊 Extraídos ${reversedResults.length} resultados`);
        
        // Log dos primeiros 5 para debug
        if (reversedResults.length > 0) {
            console.log('Primeiros 5 resultados:', 
                reversedResults.slice(0, 5).map(r => `${r.multiplier}x`).join(', '));
        } else {
            console.log("⚠️ Nenhum resultado encontrado. Verificando DOM...");
            
            // Debug: Mostrar estrutura DOM
            const bodyText = document.body.textContent;
            const xCount = (bodyText.match(/x/g) || []).length;
            //console.log(`Número de 'x' na página: ${xCount}`);
            
            // Procurar por classes específicas
            const allClasses = new Set();
            document.querySelectorAll('*').forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    el.className.split(' ').forEach(c => allClasses.add(c));
                }
            });
            //console.log("Classes encontradas:", Array.from(allClasses).filter(c => c.length < 20));
        }
        
        return reversedResults;
    } catch (error) {
        console.error("Erro ao extrair resultados:", error);
        return [];
    }
}

// Função para detectar padrões - MESMA LÓGICA DO PYTHON
function analyzePatterns(results) {
    const recentResults = results.slice(0, 12); // Analisar últimos 12 resultados (como no Python)
    
    if (recentResults.length < 12) {
        console.log(`⚠️ Apenas ${recentResults.length} resultados, precisa de 12 para análise`);
        return null;
    }
    
    // IMPLEMENTAÇÃO DA ESTRATÉGIA PRO DO PYTHON
    function filtro_tendencia_baixa(lista) {
        // "sum(n < 2 for n in lista[:8]) >= 6 and all(n < 2 for n in lista[:4])"
        const primeiro8 = lista.slice(0, 8);
        const primeiro4 = lista.slice(0, 4);
        
        const baixosPrimeiro8 = primeiro8.filter(n => n < 2).length;
        const todosBaixosPrimeiro4 = primeiro4.every(n => n < 2);
        
        return baixosPrimeiro8 >= 6 && todosBaixosPrimeiro4;
    }
    
    function filtro_sem_pico_recente(lista) {
        // "not any(n >= 10 for n in lista[:7])"
        const primeiro7 = lista.slice(0, 7);
        return !primeiro7.some(n => n >= 10);
    }
    
    function filtro_pressao(lista) {
        // "meio = [n for n in lista[:10] if 3 <= n <= 7]"
        // "return len(meio) <= 2"
        const primeiro10 = lista.slice(0, 10);
        const meio = primeiro10.filter(n => n >= 3 && n <= 7);
        return meio.length <= 2;
    }
    
    // Extrair apenas os multiplicadores
    const multipliers = recentResults.map(r => r.multiplier);
    
    // Aplicar filtros
    const tendenciaBaixa = filtro_tendencia_baixa(multipliers);
    const semPicoRecente = filtro_sem_pico_recente(multipliers);
    const pressao = filtro_pressao(multipliers);
    
    //console.log(`📊 Análise: tendenciaBaixa=${tendenciaBaixa}, semPicoRecente=${semPicoRecente}, pressao=${pressao}`);
    
    // Verificar padrão baseado no modo atual
    let shouldAlert = false;
    let pattern = "";
    let alertType = "info";
    
    // Modo TESTE: alerta em toda partida
    if (currentConfig.mode === "TESTE") {
        shouldAlert = true;
        pattern = "MODO TESTE - Partida detectada";
        alertType = "warning";
    }
    // Estratégia PRO (Conservador/Médio/Agressivo)
    else if (tendenciaBaixa && semPicoRecente && pressao) {
        shouldAlert = true;
        
        // Determinar sequência de baixos consecutivos
        let consecutiveLows = 0;
        let maxConsecutiveLows = 0;
        let lowStreak = [];
        
        for (let i = 0; i < multipliers.length; i++) {
            if (multipliers[i] < 2.00) {
                consecutiveLows++;
                lowStreak.push(multipliers[i]);
                maxConsecutiveLows = Math.max(maxConsecutiveLows, consecutiveLows);
            } else {
                consecutiveLows = 0;
                lowStreak = [];
            }
        }
        
        // Verificar qual modo ativa
        const requiredLows = {
            "AGRESSIVO": 3,
            "MODERADO": 4,
            "CONSERVADOR": 5
        };
        
        const required = requiredLows[currentConfig.mode] || 3;
        
        if (maxConsecutiveLows >= required) {
            pattern = `ESTRATÉGIA PRO ATIVADA (${maxConsecutiveLows} baixos)`;
            alertType = currentConfig.mode === "CONSERVADOR" ? "success" : "warning";
        } else {
            shouldAlert = false;
        }
    }
    
    return {
        shouldAlert: shouldAlert,
        pattern: pattern,
        alertType: alertType,
        consecutiveLows: 0, // Será calculado se necessário
        recentCount: recentResults.length,
        analysis: {
            tendenciaBaixa: tendenciaBaixa,
            semPicoRecente: semPicoRecente,
            pressao: pressao
        }
    };
}

// ========== MONITORAMENTO PRINCIPAL ==========

// Função principal de monitoramento
function monitorGames() {
    if (!isMonitoring) return;
    
    try {
        const results = extractGameResults();
        
        if (results.length === 0) {
            // Tentar novamente
            setTimeout(() => {
                const retryResults = extractGameResults();
                if (retryResults.length > 0 && !lastProcessedGame) {
                    console.log("Histórico encontrado após espera");
                    lastProcessedGame = retryResults[0].multiplier;
                }
            }, 3000);
            return;
        }
        
        // Verificar se é um novo jogo (baseado no primeiro resultado)
        const latestGame = results[0];
        
        if (lastProcessedGame !== latestGame.multiplier) {
            lastProcessedGame = latestGame.multiplier;
            
            // Notificar nova partida detectada
            chrome.runtime.sendMessage({
                type: "NEW_GAME_DETECTED",
                multiplier: latestGame.multiplier
            });
            
            // Mostrar novo jogo (discreto) apenas no modo TESTE
            if (currentConfig.mode === "TESTE") {
                showPageAlert(
                    "🎮 NOVA PARTIDA",
                    `${latestGame.multiplier.toFixed(2)}x`,
                    latestGame.isLow ? 'info' : 'warning',
                    2000
                );
            }
            
            console.log(`🎮 Nova partida: ${latestGame.multiplier.toFixed(2)}x (${latestGame.isLow ? 'Baixo' : 'Alto'})`);
            
            // Analisar padrões
            const analysis = analyzePatterns(results);
            
            if (analysis && analysis.shouldAlert) {
                //console.log(`🚨 Alerta detectado: ${analysis.pattern}`);
                //console.log(`📊 Análise detalhada:`, analysis.analysis);
                
                // Mostrar alerta baseado no tipo de notificação configurado
                if (currentConfig.notificationType === "PAGE_ALERT" || currentConfig.mode === "TESTE") {
                    // Alerta na página (discreto)
                    showPageAlert(
                        `🚨 ${currentConfig.mode}`,
                        `${analysis.pattern}<br>` +
                        `Baixos: ${analysis.analysis.tendenciaBaixa ? '✅' : '❌'} | ` +
                        `Sem pico: ${analysis.analysis.semPicoRecente ? '✅' : '❌'} | ` +
                        `Pressão: ${analysis.analysis.pressao ? '✅' : '❌'}`,
                        analysis.alertType,
                        7000
                    );
                    
                    // Badge adicional
                    showScreenBadge(
                        `🔥 ${currentConfig.mode}`,
                        analysis.alertType === 'success' ? '#10b981' : 
                        analysis.alertType === 'warning' ? '#f59e0b' : '#ef4444',
                        5000
                    );
                }
                
                // Enviar sinal para background
                chrome.runtime.sendMessage({
                    type: "ENTRY_SIGNAL",
                    mode: currentConfig.mode,
                    pattern: analysis.pattern,
                    consecutiveLows: analysis.consecutiveLows,
                    sound: currentConfig.sound,
                    notificationType: currentConfig.notificationType
                });
                
                // Tocar som se configurado
                if (currentConfig.sound) {
                    chrome.runtime.sendMessage({ type: "PLAY_SOUND" });
                }
            }
            
            // Atualizar histórico
            gameHistory = results.slice(0, 30);
            
            // Atualizar indicador de histórico
            if (gameHistory.length >= 3) {
                const lastThree = gameHistory.slice(0, 3).map(r => 
                    `${r.multiplier.toFixed(2)}x`
                ).join(' → ');
                
                const indicator = getOrCreateHistoryIndicator();
                indicator.textContent = `Últimos: ${lastThree} | Modo: ${currentConfig.mode}`;
                indicator.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Erro no monitoramento:", error);
    }
}

// ========== INICIALIZAÇÃO ==========

// Iniciar monitoramento
console.log("🔍 Iniciando monitoramento discreto...");
const monitorInterval = setInterval(monitorGames, 1500);

// Inicializar overlay
createAlertOverlay();

// Adicionar botão de controle rápido na página
function addQuickControl() {
    // Verificar se já existe
    if (document.querySelector('#aviator-quick-control')) return;
    
    const controlBtn = document.createElement('div');
    controlBtn.id = 'aviator-quick-control';
    controlBtn.style.cssText = `
        position: fixed;
        bottom: 50px;
        right: 20px;
        background: #3b82f6;
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        font-size: 20px;
        opacity: 0.7;
        transition: opacity 0.3s;
    `;
    controlBtn.textContent = '⚡';
    controlBtn.title = 'Aviator Monitor - Clique para status';
    
    controlBtn.addEventListener('mouseenter', () => {
        controlBtn.style.opacity = '1';
    });
    
    controlBtn.addEventListener('mouseleave', () => {
        controlBtn.style.opacity = '0.7';
    });
    
    controlBtn.addEventListener('click', () => {
        showPageAlert(
            "⚡ Monitor Ativo",
            `Modo: ${currentConfig.mode}<br>` +
            `Som: ${currentConfig.sound ? '✅ ON' : '❌ OFF'}<br>` +
            `Histórico: ${gameHistory.length} jogos`,
            'info',
            4000
        );
    });
    
    document.body.appendChild(controlBtn);
}

// Função para explorar DOM e encontrar elementos
function exploreDOM() {
    console.log("🔍 Explorando DOM para encontrar histórico...");
    
    // Coletar informações sobre o DOM
    const elementsWithX = [];
    const classesWithX = new Set();
    
    document.querySelectorAll('*').forEach(element => {
        const text = element.textContent.trim();
        if (text.includes('x') && text.length < 50) {
            elementsWithX.push({
                element: element.tagName,
                className: element.className,
                text: text,
                fullText: element.outerHTML.substring(0, 200)
            });
        }
        
        // Coletar classes
        if (element.className && typeof element.className === 'string') {
            element.className.split(' ').forEach(c => {
                if (c && c.length < 30) classesWithX.add(c);
            });
        }
    });
    
    console.log("Elementos com 'x':", elementsWithX.slice(0, 10));
    console.log("Classes encontradas:", Array.from(classesWithX));
    
    // Tentar encontrar histórico por classes comuns
    const commonHistoryClasses = ['history', 'result', 'payout', 'multiplier', 'game', 'round'];
    const possibleClasses = Array.from(classesWithX).filter(cls => 
        commonHistoryClasses.some(keyword => cls.toLowerCase().includes(keyword))
    );
    
    console.log("Possíveis classes de histórico:", possibleClasses);
    
    // Tentar com cada classe possível
    possibleClasses.forEach(className => {
        const elements = document.querySelectorAll(`.${className}`);
        console.log(`Classe "${className}": ${elements.length} elementos`);
        
        elements.forEach((el, i) => {
            const text = el.textContent.trim();
            if (text.includes('x')) {
                console.log(`  [${i}]: ${text.substring(0, 50)}`);
            }
        });
    });
}

// Adicionar controles após a página carregar
function initializePage() {
    addQuickControl();
    getOrCreateHistoryIndicator();
    
    // Explorar DOM após carregar
    setTimeout(exploreDOM, 2000);
    
    // Verificar se há histórico imediatamente
    setTimeout(() => {
        const initialResults = extractGameResults();
        if (initialResults.length > 0) {
            console.log(`✅ Histórico inicial carregado: ${initialResults.length} resultados`);
            gameHistory = initialResults.slice(0, 30);
            
            // Definir último jogo processado
            if (initialResults[0]) {
                lastProcessedGame = initialResults[0].multiplier;
            }
        } else {
            console.log("❌ Nenhum resultado encontrado inicialmente");
        }
    }, 3000);
}

// Aguardar página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// Parar monitoramento quando a página for fechada
window.addEventListener('beforeunload', () => {
    clearInterval(monitorInterval);
    isMonitoring = false;
    console.log("🛑 Monitoramento parado");
});

// Log periódico
setInterval(() => {
    if (isMonitoring) {
        console.log(`📈 Monitor ativo | Modo: ${currentConfig.mode} | Histórico: ${gameHistory.length} jogos`);
    }
}, 60000);
