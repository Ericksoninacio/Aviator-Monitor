# 🛫 Aviator Monitor PRO

Extensão para Google Chrome que **monitora o jogo Aviator em tempo real**, identifica padrões de multiplicadores e **automatiza o preenchimento e envio de apostas**, com controle total pelo usuário.

---

## 🎯 Objetivo do Projeto

- Monitorar o histórico de multiplicadores em tempo real
- Identificar padrões configuráveis pelo usuário
- Preencher automaticamente os campos de aposta a cada rodada
- Notificar via alerta visual, sonoro e notificação do sistema
- Permitir entrada automática opcional com confirmação de segurança

> ⚠️ **Aviso:** Este projeto é uma ferramenta educacional e experimental. Não garante resultados, não influencia o RNG do jogo e não se responsabiliza por perdas financeiras. O uso é de inteira responsabilidade do usuário.

---

## 🧠 Modos de Operação

| Modo | Confiança mínima | Padrões ativos |
|---|---|---|
| 🧪 Teste | Sem filtro | Todos os padrões |
| 🟢 Conservador | ≥ 80% | Apenas TENDENCIA_ALTA |
| 🟡 Moderado | ≥ 70% | + REVERSAO_FORTE |
| 🔴 Agressivo | ≥ 60% | Todos os 4 padrões |

---

## 🎨 Classificação de Multiplicadores

Espelha exatamente a função `cor()` do frontend da plataforma:

| Classe | Condição | Cor |
|---|---|---|
| `CRASH` | `v === 1.00` (toFixed 2) | 🔴 `#b01212` Vermelho |
| `BAIXO` | `v < 2.00` | 🔵 `#00c3ff` Azul |
| `MEDIO` | `v < 10.00` | 🟣 `#6107ac` Roxo |
| `ALTO` | `v ≥ 10.00` | 🩷 `#eb63a7` Rosa |

---

## 🎲 Padrões de Detecção

Os padrões são totalmente configuráveis pelo popup (aba **Padrões**). Cada padrão define uma sequência de 4 classificações (posição `[0]` = mais recente → `[3]` = mais antigo) e uma porcentagem de confiança.

**Padrões padrão:**

| Nome | Sequência [0→3] | Confiança |
|---|---|---|
| TENDENCIA_ALTA | MEDIO → MEDIO → MEDIO → BAIXO | 85.3% |
| REVERSAO_FORTE | BAIXO → BAIXO → BAIXO → MEDIO | 78.1% |
| EXPLOSAO_TOPO  | ALTO → MEDIO → BAIXO → BAIXO  | 72.4% |
| RECUPERACAO    | MEDIO → BAIXO → BAIXO → BAIXO | 68.9% |

> Os padrões são salvos no `chrome.storage.local` e sincronizados com o `content.js` em tempo real sem recarregar a página.

---

## ⚙️ Fluxo de Operação

A cada **nova rodada detectada** (hash de resultados muda):

```
1. Lê multiplicadores da página (16 seletores + fallback por regex)
2. Lê saldo via XPath: //span[contains(@class,'balance-amount')]
3. Calcula Entrada 1 (% da banca) e Proteção (lucro da E1 × 10x)
4. prepararCampos() — preenche SEMPRE, toda rodada:
   ├─ fecharOverlays() → fecha modais/close/Aceitar/Entendi
   ├─ selecionarModoAuto(p1 + p2) → clica aba "Auto" ou "Automático"
   ├─ ativarAutoCashout(p1 + p2) → ativa switch se estiver off
   ├─ definirSaida(p1, 1.30) + definirValorAposta(p1, valor1)
   └─ definirSaida(p2, 10.00) + definirValorAposta(p2, valor2)
5. Se padrão detectado E dentro do limiar da estratégia:
   ├─ Alerta visual na página + notificação do sistema + badge + som
   └─ clicarEntrada() → clica Apostar p1+p2 se autoEntrar=true
```

---

## 💰 Gestão de Banca

```
valor_1 = max(saldo × % banca,       R$ 1,00)
lucro_1 = valor_1 × (odd_entrada1 - 1)
valor_2 = max(lucro_1,               R$ 1,00)
```

- **Entrada 1** → sai na odd configurada (padrão: 1.30x)
- **Proteção** → sai na odd2 configurada (padrão: 10x)

---

## 🛑 Stop Loss / Stop Gain

Calculados sobre o **saldo capturado no momento em que o monitor é ligado**:

```
variação% = (saldo_atual - saldo_inicial) / saldo_inicial × 100

Stop Loss → desliga se variação ≤ -X%
Stop Gain → desliga se variação ≥ +Y%
```

Ao ser acionado:
1. Todos os observers e intervalos são desativados imediatamente
2. Notificação do sistema com `requireInteraction: true`
3. Botão power no popup atualiza para vermelho
4. Estado `monitorAtivo: false` persiste no storage

> `0 = desativado`. Configurados na aba Config.

---

## 🔔 Sistema de Alertas

Quando padrão detectado, **4 sinais simultâneos**:

1. **Notificação do sistema** — aparece mesmo com Chrome minimizado
2. **Overlay visual na página** — card com padrão, confiança e valores
3. **Badge no ícone** — círculo verde por 8 segundos
4. **Alerta sonoro** — `alert.mp3` tocado pelo popup

> O som requer interação prévia com o popup (regra do Chrome). É desbloqueado automaticamente no primeiro clique.

---

## 🖥️ Interface do Popup

### ⚡ Botão Power (header)
- **Verde** — monitor ligado, saldo inicial capturado
- **Vermelho** — monitor desligado, zero CPU, zero leitura de DOM
- Estado persiste entre sessões

### 📊 Aba Monitor
- Chips coloridos dos últimos 6 resultados
- Card do padrão detectado com barra de confiança animada
- Saldo / Entrada 1 / Proteção em tempo real
- Botão de teste de alerta + contador de sinais

### 🎲 Aba Padrões
- Lista com badges coloridos da sequência
- CRUD completo (criar / editar / remover)
- **Exportar** — baixa `.json` com todos os padrões
- **Importar** — cola JSON ou carrega arquivo com validação
- **Resetar** — restaura padrões padrão

### ⚙️ Aba Config
| Campo | Padrão |
|---|---|
| Estratégia | Conservador ≥20% |
| % da Banca | 5% |
| Odd Entrada 1 | 1.30x |
| Odd Proteção (E2) | 10.00x |
| Stop Loss | 0 (desativado) |
| Stop Gain | 0 (desativado) |
| Alerta Sonoro | Ligado |
| Entrada Automática | Desligado |

---

## 🧩 Arquitetura

```
content.js    → lê DOM, detecta padrões, stop loss/gain, preenche/clica apostas
background.js → estado global, notificações, badge, relay, foco de aba
popup.js      → interface, configurações, CRUD, import/export, áudio
popup.css     → tema escuro, componentes visuais
manifest.json → permissões, content scripts, ícones
```

---

## 📦 Estrutura de Pastas

```
aviator-monitor/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
├── sounds/
│   └── alert.mp3
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## ⚙️ Instalação Manual

1. Abra `chrome://extensions`
2. Ative **Modo do Desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta do projeto

---

## 📁 Formato JSON para Importação de Padrões

```json
[
  {
    "nome": "MEU_PADRAO",
    "sequencia": ["BAIXO", "MEDIO", "ALTO", "BAIXO"],
    "confianca": 19.2
  }
]
```

Regras: `sequencia` com exatamente 4 itens (`BAIXO`, `MEDIO` ou `ALTO`), `confianca` entre 1–100. Duplicatas por nome são mescladas.

---

## ⚠️ Limitações Conhecidas

- O Chrome não permite abrir popup automaticamente
- O Service Worker (MV3) não pode reproduzir áudio — gerenciado pelo popup
- O alerta sonoro depende de interação prévia com o popup
- Seletores DOM podem variar entre versões da plataforma

---

## 📌 Casas de Apostas Compatíveis

- [x] **Superbet**
- [x] **Betano**
- [x] **bet365**
- [ ] **KTO**
- [x] **Betnacional**
- [x] **Maxima.bet**
- [x] **Suprema.bet**
- [x] **Ultra.bet**
- [x] **Luck.bet**

---

## 🚀 Roadmap

- [x] Leitura avançada do histórico (seletores universais + fallback por regex)
- [x] Classificação calibrada com dados reais (BAIXO / MEDIO / ALTO)
- [x] Limiares de estratégia baseados em 5.000 rodadas reais
- [x] Padrões configuráveis — CRUD completo
- [x] Importação e exportação de padrões em JSON
- [x] Gestão de banca automática
- [x] Odd de Proteção configurável
- [x] Preenchimento automático dos campos Angular
- [x] Fechar overlays/modais automaticamente
- [x] Entrada automática com checkbox de segurança
- [x] Botão power — liga/desliga completo
- [x] Stop Loss e Stop Gain por % da banca
- [x] Notificações com auto-fechamento e foco na aba do jogo
- [ ] Cooldown configurável entre alertas
- [ ] Estatísticas de acerto por padrão
- [ ] Exportação do histórico de sinais
- [ ] Suporte a mais casas de apostas

---

## 👨‍💻 Autor

**Erickson Inácio** — Desenvolvido com força de vontade, respeito às regras do Chrome e foco em estabilidade de longo prazo.