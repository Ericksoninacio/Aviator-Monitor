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
valor_1 = max(saldo × % banca,  R$ 1,00)
lucro_1 = valor_1 × (odd_entrada1 - 1)
valor_2 = max(lucro_1,          R$ 1,00)
```

- **Entrada 1** → sai na odd configurada (padrão: 1.30x)
- **Proteção** → sai em 10x (cobre o custo da Entrada 1)

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

O popup é organizado em **3 abas**:

### 📊 Monitor
- Chips coloridos dos últimos 6 resultados com classificação
- Card do padrão detectado com barra de confiança animada
- Gestão de banca: Saldo / Entrada 1 / Proteção em tempo real
- Botão de teste de alerta + contador de sinais

### 🎲 Padrões
- Lista todos os padrões com badges coloridos da sequência
- **Criar** novos padrões com nome, sequência e confiança
- **Editar** padrões existentes
- **Remover** padrões
- Alterações propagam ao `content.js` instantaneamente

### ⚙️ Config
- Estratégia (Teste / Conservador / Moderado / Agressivo)
- % da Banca (1–50%)
- Odd Entrada 1 (1.01–10)
- Alerta Sonoro (toggle)
- **Entrada Automática** — `Marcado = clica Apostar · Desmarcado = só preenche`

---

## 🧩 Arquitetura

```
content.js    → lê DOM, detecta padrões, preenche/clica apostas, fecha overlays
background.js → estado global, notificações, badge, relay de mensagens
popup.js      → interface, configurações, CRUD de padrões, áudio
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
    └── icon128.png
```

---

## ⚙️ Instalação Manual

1. Abra `chrome://extensions`
2. Ative **Modo do Desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta do projeto
5. A extensão aparecerá na barra do Chrome

---

## ⚠️ Limitações Conhecidas

- O Chrome não permite abrir popup automaticamente
- O Service Worker (MV3) não pode reproduzir áudio — gerenciado pelo popup
- O alerta sonoro depende de interação prévia com o popup
- Seletores DOM podem variar entre versões da plataforma — fallbacks múltiplos estão implementados
- O botão Apostar precisa estar no estado correto para ser clicado (não estar em aposta ativa)

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
- [x] Classificação de velas espelhando a plataforma (CRASH / BAIXO / MEDIO / ALTO)
- [x] Detecção de padrões com limiares por estratégia
- [x] Padrões configuráveis pelo popup (CRUD completo)
- [x] Gestão de banca automática
- [x] Preenchimento automático dos campos Angular (input/change/blur)
- [x] Fechar overlays/modais automaticamente (MutationObserver + intervalo)
- [x] Entrada automática com checkbox de segurança
- [x] Modo Auto / Automático (compatível com ambos os textos)
- [x] Popup com tema escuro e tipografia DM Sans / DM Mono
- [ ] Cooldown configurável entre alertas
- [ ] Estatísticas de acerto por padrão
- [ ] Exportação do histórico de sinais
- [ ] Suporte a mais casas de apostas

---

## 👨‍💻 Autor Erickson Inácio

Desenvolvido com **força de vontade kkkk**, respeito às regras do Chrome e foco em estabilidade de longo prazo.

Se precisar evoluir o projeto, continue com cautela e testes constantes.