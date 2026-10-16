# 🔥 "Ant-Shant" (Chaos Mode) — Feature Specification & Design Document

> **Mode Name:** Ant-Shant Mode (*अंट-शंट / Pure Chaos*)  
> **Tagline:** *"Expect the unexpected. Rules change on every roll."*  
> **Status:** Documented for future implementation  
> **Target Version:** World Tycoon v3.0  

---

## 1. Overview & Philosophy

In traditional Monopoly/Tycoon games, once a player establishes a dominant property lead, the endgame can become predictable and slow. **Ant-Shant Mode** introduces high-volatility, dynamic table events, pocket utility cards, and wild economic swings designed to keep every player in contention until the final second.

It is designed for parties, fast-paced matches, and pure fun where fortunes can flip upside down in a single round.

---

## 2. Core Mechanics

### 2.1. The Chaos Ticker (Global Market Events)
Every 2–3 rounds (or whenever a player lands on an Event/Chance tile or rolls Double 6s), the game triggers a **Global Market Event** that stays active for 1 to 2 full rounds across the entire table.

#### Active Global Event Roster:
1. 📈 **Global Tourism Boom**  
   * **Effect:** All Resorts (Tile 8 & 24) and Level 3+ Skyscraper cities collect **2× Rent**.  
   * **Duration:** 2 rounds.
2. 📉 **Economic Recession & Stimulus**  
   * **Effect:** All rent payments are reduced by $50\%$. The World Bank issues an immediate **\$250,000 Stimulus Payout** to every player.  
   * **Duration:** 1 round.
3. ✈️ **Airline Fare War**  
   * **Effect:** World Tour flight cost is **$100\%$ waived** (\$0 fee). Anyone landing on or passing World Tour can fly anywhere on the globe.  
   * **Duration:** 1 round.
4. ⚠️ **Airspace Strike (No-Fly Zone)**  
   * **Effect:** The World Tour tile is temporarily shut down. Landing on it does not allow flights.  
   * **Duration:** 1 round.
5. 🏛️ **Global Property Tax Audit**  
   * **Effect:** Every tycoon must pay **\$50,000 per house** and **\$150,000 per skyscraper** into the Central Festival Pot. (Instantly inflates the next Jackpot!).  
   * **Duration:** Instant.
6. 🌪️ **Natural Phenomenon (City Damage)**  
   * **Effect:** A random city on the board with building upgrades loses 1 house level (insurance pays the owner half construction cost).  
   * **Duration:** Instant.
7. 🔀 **Freaky Friday (Cash Redistribution)**  
   * **Effect:** The richest player and poorest player pool their cash and split it 50/50, or a mini-wheel spins to swap cash balances!  
   * **Duration:** Instant.
8. ⚡ **Hyperinflation Sprint**  
   * **Effect:** Passing GO pays **\$800,000** (4× normal salary)!  
   * **Duration:** 2 rounds.

---

### 2.2. Pocket Inventory Cards (Hold & Play Anytime)
Players can hold up to **2 Pocket Cards** in their HUD tray and play them on their turn or trigger them reactively:

| Card Icon & Name | Type | Action / Effect |
|---|---|---|
| 🛡️ **Diplomatic Immunity** | Reactive | Automatically negates the next rent payment you owe on an opponent's tile (You pay **\$0**!). |
| 🏗️ **Architectural Grant** | Active | Instantly upgrade any 1 of your owned cities by **+1 level for free** (no construction fee). |
| 🎫 **VIP Island Escape** | Active | Escape Tropical Island detention immediately without paying \$150K bail or rolling doubles. |
| ⚖️ **Eminent Domain** | Active | Pick any unmonopolized city owned by a rival and force it into an **Immediate Public Auction** where everyone can bid! |
| 💼 **Dividend Shakedown** | Active | Every rival tycoon must immediately pay you **\$100,000** in cash. |
| 🚫 **Rent Freeze / Code Violation** | Active | Block a chosen rival city from collecting any rent for 2 full rounds. |
| 🎲 **Triple Threat Dice** | Active | Roll **3 dice** instead of 2 on your turn, triggering triple passing bonuses! |

---

## 3. Victory Conditions in Ant-Shant Mode

In addition to the 4 standard victory rules, Ant-Shant adds:
1. **Total Hegemony (Global Footprint)**: First player to own at least one city in **every single color group** on the board instantly wins.
2. **Jackpot Heist**: Any player whose Festival Jackpot win pushes their total Net Worth past **\$10,000,000** triggers instant victory.
3. **Timed Net Worth Showdown**: Matches typically default to **15 min or 30 min**, where maximum chaos unfolds before the final bell rings.

---

## 4. UI & Visual Blueprint

### 4.1. Main Menu Lobby Integration
* **Mode Selector Switch**:
  * `[ 🌍 Classic World Tour ]` vs `[ 🔥 Ant-Shant (Chaos Mode) ]`
* When Ant-Shant is selected:
  * Lobby background gains fiery / glowing purple cyberpunk particle accents.
  * Description pill: *"Dynamic global events, pocket action cards, and volatile market swings!"*

### 4.2. In-Game HUD Additions
* **Active Event Banner**: Top-center floating ticker:
  ```html
  <div id="hud-chaos-event-banner" class="bg-gradient-to-r from-amber-500 to-rose-600 text-white px-4 py-1.5 rounded-full font-black text-xs shadow-lg flex items-center gap-2 animate-pulse">
    <span>📈 TOURISM BOOM ACTIVE</span>
    <span class="bg-white/20 px-2 py-0.5 rounded-full">2 Turns Left</span>
  </div>
  ```
* **Pocket Cards Tray**: Attached to player corner HUD card:
  ```html
  <div class="pocket-cards-tray flex gap-1.5 mt-1">
    <button class="pocket-card-btn" title="Diplomatic Immunity (Shield)">🛡️</button>
    <button class="pocket-card-btn" title="Architectural Grant">🏗️</button>
  </div>
  ```

---

## 5. Technical Architecture & Data Schema

### 5.1. State Schema (`src/game/state.js`)
```javascript
export const chaosState = {
  activeMode: 'classic', // 'classic' | 'ant_shant'
  currentGlobalEvent: null, // { id: 'tourism_boom', roundsRemaining: 2, name: '...' }
  eventHistory: [],
  playerPocketCards: {
    0: [], // array of card IDs: ['rent_shield', 'architectural_grant']
    1: [],
    2: [],
    3: []
  }
};
```

### 5.2. WebRTC P2P Sync (`src/network/p2p.js`)
* Host broadcasts chaos triggers via:
  ```javascript
  broadcastAction('ACTION_TRIGGER_CHAOS_EVENT', {
    eventId: 'tourism_boom',
    duration: 2,
    seed: Math.random()
  });
  ```
* Playing pocket cards synced via:
  ```javascript
  broadcastAction('ACTION_PLAY_POCKET_CARD', {
    playerIdx: 0,
    cardId: 'rent_shield'
  });
  ```

---

## 6. Implementation Checklist (For Future Sprint)

- [ ] Add `ant_shant` mode toggle button to `world-tycoon/src/ui/setup.js` & `index.html`.
- [ ] Create `world-tycoon/src/game/chaos.js` containing event deck & card play handlers.
- [ ] Hook into `engine.js` `advanceTurn()` to decrement event duration rounds.
- [ ] Add 3D card draw animation in `three/scene.js`.
- [ ] Hook `calculateTileRent()` in `rules.js` to multiply rent when `tourism_boom` is active.
- [ ] Add pocket card UI pills to corner HUD cards in `ui/hud.js`.
