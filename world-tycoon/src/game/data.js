/**
 * game/data.js
 * Board tile definitions, player themes, chance prizes, and group metadata.
 * Supports multiple board editions: World Cities and Rajasthan (India) Cities.
 */

export const WORLD_GROUP_META = {
  brown:     { hex: '#8d6e63', name: 'Caucasus & Nile' },
  lightblue: { hex: '#38bdf8', name: 'Aegean & Black Sea' },
  pink:      { hex: '#f472b6', name: 'Anatolia & Levant' },
  orange:    { hex: '#fb923c', name: 'Mediterranean Hubs' },
  red:       { hex: '#ef4444', name: 'Asian Tigers' },
  yellow:    { hex: '#facc15', name: 'European Capitals' },
  green:     { hex: '#4ade80', name: 'Global Supercities' },
  darkblue:  { hex: '#6366f1', name: 'Bosphorus & Crown' },
};

export const RAJASTHAN_GROUP_META = {
  brown:     { hex: '#8d6e63', name: 'Matsya & Gateway' },
  lightblue: { hex: '#38bdf8', name: 'Hadoti & Ajmer' },
  pink:      { hex: '#f472b6', name: 'Shekhawati Heritage' },
  orange:    { hex: '#fb923c', name: 'Sacred Pushkar & Forest' },
  red:       { hex: '#ef4444', name: 'Desert Fortresses' },
  yellow:    { hex: '#facc15', name: 'Citadels & Golden Thar' },
  green:     { hex: '#4ade80', name: 'Marwar & Sun City' },
  darkblue:  { hex: '#6366f1', name: 'Royal Jewels (Udaipur & Jaipur)' },
};

export const WORLD_BOARD_TILES = [
  // Bottom Corner (0)
  { id: 0,  name: 'START',      subtitle: 'Pass +300K / Land +400K',        type: 'start'   },

  // Side 1: Bottom-Left (1..7)
  { id: 1,  name: 'CAIRO',      price: 120000, rent: [25000, 75000, 180000, 320000, 480000],  houseCost: 80000,  type: 'city',   group: 'brown'     },
  { id: 2,  name: 'CHANCE',     type: 'chance' },
  { id: 3,  name: 'MUMBAI',     price: 140000, rent: [30000, 90000, 210000, 360000, 540000],  houseCost: 80000,  type: 'city',   group: 'brown'     },
  { id: 4,  name: 'BENGALURU',  price: 180000, rent: [40000, 110000, 260000, 440000, 650000], houseCost: 100000, type: 'city',   group: 'lightblue' },
  { id: 5,  name: 'BANGKOK',    price: 190000, rent: [45000, 120000, 280000, 470000, 700000], houseCost: 100000, type: 'city',   group: 'lightblue' },
  { id: 6,  name: 'ATHENS',     price: 200000, rent: [50000, 130000, 300000, 500000, 750000], houseCost: 100000, type: 'city',   group: 'lightblue' },
  { id: 7,  name: 'RESORT',     price: 200000, rent: [60000, 140000, 280000, 500000, 500000], type: 'resort' },

  // Left Corner (8)
  { id: 8,  name: 'ISLAND',     subtitle: 'Roll double to leave', type: 'island' },

  // Side 2: Top-Left (9..15)
  { id: 9,  name: 'TORONTO',    price: 240000, rent: [55000, 150000, 350000, 580000, 850000],   houseCost: 130000, type: 'city', group: 'pink'   },
  { id: 10, name: 'MADRID',     price: 250000, rent: [60000, 160000, 370000, 610000, 900000],   houseCost: 130000, type: 'city', group: 'pink'   },
  { id: 11, name: 'SEOUL',      price: 260000, rent: [65000, 175000, 400000, 650000, 950000],   houseCost: 130000, type: 'city', group: 'pink'   },
  { id: 12, name: 'CHANCE',     type: 'chance' },
  { id: 13, name: 'SYDNEY',     price: 300000, rent: [75000, 200000, 450000, 740000, 1080000],  houseCost: 160000, type: 'city', group: 'orange' },
  { id: 14, name: 'BERLIN',     price: 310000, rent: [80000, 210000, 470000, 770000, 1120000],  houseCost: 160000, type: 'city', group: 'orange' },
  { id: 15, name: 'AMSTERDAM',  price: 330000, rent: [85000, 225000, 500000, 820000, 1200000],  houseCost: 160000, type: 'city', group: 'orange' },

  // Top Corner (16)
  { id: 16, name: 'FESTIVAL',   subtitle: '2x City Rent & Pool', type: 'festival' },

  // Side 3: Top-Right (17..23)
  { id: 17, name: 'DUBAI',      price: 350000, rent: [90000, 240000, 540000, 880000, 1280000],   houseCost: 190000, type: 'city', group: 'red'    },
  { id: 18, name: 'CHANCE',     type: 'chance' },
  { id: 19, name: 'SINGAPORE',  price: 360000, rent: [95000, 250000, 560000, 920000, 1340000],   houseCost: 190000, type: 'city', group: 'red'    },
  { id: 20, name: 'HONG KONG',  price: 390000, rent: [105000, 270000, 600000, 980000, 1420000],  houseCost: 190000, type: 'city', group: 'red'    },
  { id: 21, name: 'ROME',       price: 400000, rent: [110000, 285000, 630000, 1020000, 1500000], houseCost: 220000, type: 'city', group: 'yellow' },
  { id: 22, name: 'PARIS',      price: 400000, rent: [110000, 285000, 630000, 1020000, 1500000], houseCost: 220000, type: 'city', group: 'yellow' },
  { id: 23, name: 'LONDON',     price: 410000, rent: [115000, 300000, 660000, 1080000, 1580000], houseCost: 220000, type: 'city', group: 'yellow' },

  // Right Corner (24)
  { id: 24, name: 'WORLD TOUR', subtitle: 'Fly anywhere',        type: 'worldtour' },

  // Side 4: Bottom-Right (25..31)
  { id: 25, name: 'ZURICH',     price: 450000, rent: [125000, 330000, 720000, 1180000, 1720000], houseCost: 250000, type: 'city', group: 'green'    },
  { id: 26, name: 'NEW YORK',   price: 460000, rent: [130000, 340000, 750000, 1220000, 1780000], houseCost: 250000, type: 'city', group: 'green'    },
  { id: 27, name: 'RIVIERA',    price: 400000, rent: [100000, 220000, 400000, 700000, 700000],   type: 'resort' },
  { id: 28, name: 'TOKYO',      price: 480000, rent: [140000, 360000, 800000, 1300000, 1900000], houseCost: 250000, type: 'city', group: 'green'    },
  { id: 29, name: 'TAX',        amount: 250000, type: 'tax' },
  { id: 30, name: 'MONACO',     price: 540000, rent: [165000, 420000, 920000, 1500000, 2150000], houseCost: 300000, type: 'city', group: 'darkblue' },
  { id: 31, name: 'ISTANBUL',   price: 600000, rent: [190000, 480000, 1050000, 1700000, 2450000],houseCost: 300000, type: 'city', group: 'darkblue' },
];

export const RAJASTHAN_BOARD_TILES = [
  // Bottom Corner (0)
  { id: 0,  name: 'START',       subtitle: 'Pass +300K / Land +400K',        type: 'start'   },

  // Side 1: Bottom-Left (1..7)
  { id: 1,  name: 'ALWAR',       price: 120000, rent: [25000, 75000, 180000, 320000, 480000],  houseCost: 80000,  type: 'city',   group: 'brown'     },
  { id: 2,  name: 'CHANCE',      type: 'chance' },
  { id: 3,  name: 'BHARATPUR',   price: 140000, rent: [30000, 90000, 210000, 360000, 540000],  houseCost: 80000,  type: 'city',   group: 'brown'     },
  { id: 4,  name: 'BUNDI',       price: 180000, rent: [40000, 110000, 260000, 440000, 650000], houseCost: 100000, type: 'city',   group: 'lightblue' },
  { id: 5,  name: 'KOTA',        price: 190000, rent: [45000, 120000, 280000, 470000, 700000], houseCost: 100000, type: 'city',   group: 'lightblue' },
  { id: 6,  name: 'AJMER',       price: 200000, rent: [50000, 130000, 300000, 500000, 750000], houseCost: 100000, type: 'city',   group: 'lightblue' },
  { id: 7,  name: 'MOUNT ABU',   price: 200000, rent: [60000, 140000, 280000, 500000, 500000], type: 'resort' },

  // Left Corner (8)
  { id: 8,  name: 'ISLAND',      subtitle: 'Roll double to leave', type: 'island' },

  // Side 2: Top-Left (9..15)
  { id: 9,  name: 'SIKAR',       price: 240000, rent: [55000, 150000, 350000, 580000, 850000],   houseCost: 130000, type: 'city', group: 'pink'   },
  { id: 10, name: 'JHUNJHUNU',   price: 250000, rent: [60000, 160000, 370000, 610000, 900000],   houseCost: 130000, type: 'city', group: 'pink'   },
  { id: 11, name: 'BHILWARA',    price: 260000, rent: [65000, 175000, 400000, 650000, 950000],   houseCost: 130000, type: 'city', group: 'pink'   },
  { id: 12, name: 'CHANCE',      type: 'chance' },
  { id: 13, name: 'PUSHKAR',     price: 300000, rent: [75000, 200000, 450000, 740000, 1080000],  houseCost: 160000, type: 'city', group: 'orange' },
  { id: 14, name: 'RANTHAMBORE', price: 310000, rent: [80000, 210000, 470000, 770000, 1120000],  houseCost: 160000, type: 'city', group: 'orange' },
  { id: 15, name: 'CHITTORGARH', price: 330000, rent: [85000, 225000, 500000, 820000, 1200000],  houseCost: 160000, type: 'city', group: 'orange' },

  // Top Corner (16)
  { id: 16, name: 'FESTIVAL',    subtitle: 'Pushkar Fair & 2x Rent', type: 'festival' },

  // Side 3: Top-Right (17..23)
  { id: 17, name: 'BARMER',      price: 350000, rent: [90000, 240000, 540000, 880000, 1280000],   houseCost: 190000, type: 'city', group: 'red'    },
  { id: 18, name: 'CHANCE',      type: 'chance' },
  { id: 19, name: 'NAGAUR',      price: 360000, rent: [95000, 250000, 560000, 920000, 1340000],   houseCost: 190000, type: 'city', group: 'red'    },
  { id: 20, name: 'BIKANER',     price: 390000, rent: [105000, 270000, 600000, 980000, 1420000],  houseCost: 190000, type: 'city', group: 'red'    },
  { id: 21, name: 'KUMBHALGARH', price: 400000, rent: [110000, 285000, 630000, 1020000, 1500000], houseCost: 220000, type: 'city', group: 'yellow' },
  { id: 22, name: 'NATHDWARA',   price: 400000, rent: [110000, 285000, 630000, 1020000, 1500000], houseCost: 220000, type: 'city', group: 'yellow' },
  { id: 23, name: 'JAISALMER',   price: 410000, rent: [115000, 300000, 660000, 1080000, 1580000], houseCost: 220000, type: 'city', group: 'yellow' },

  // Right Corner (24)
  { id: 24, name: 'WORLD TOUR',  subtitle: 'Royal Express / Fly',    type: 'worldtour' },

  // Side 4: Bottom-Right (25..31)
  { id: 25, name: 'PALI',        price: 450000, rent: [125000, 330000, 720000, 1180000, 1720000], houseCost: 250000, type: 'city', group: 'green'    },
  { id: 26, name: 'AMER',        price: 460000, rent: [130000, 340000, 750000, 1220000, 1780000], houseCost: 250000, type: 'city', group: 'green'    },
  { id: 27, name: 'SAM DUNES',   price: 400000, rent: [100000, 220000, 400000, 700000, 700000],   type: 'resort' },
  { id: 28, name: 'JODHPUR',     price: 480000, rent: [140000, 360000, 800000, 1300000, 1900000], houseCost: 250000, type: 'city', group: 'green'    },
  { id: 29, name: 'TAX',         amount: 250000, type: 'tax' },
  { id: 30, name: 'UDAIPUR',     price: 540000, rent: [165000, 420000, 920000, 1500000, 2150000], houseCost: 300000, type: 'city', group: 'darkblue' },
  { id: 31, name: 'JAIPUR',      price: 600000, rent: [190000, 480000, 1050000, 1700000, 2450000],houseCost: 300000, type: 'city', group: 'darkblue' },
];

export const WORLD_CHANCE_WHEEL_PRIZES = [
  { label: '+400K Grant',  color: '#4ade80', type: 'cash',   amount: 400000, desc: 'World Bank Development Grant! Collect 400K!'           },
  { label: 'Fly to START', color: '#38bdf8', type: 'move',   target: 0,      desc: 'Express Jet to START! Collect +300K!'                  },
  { label: '-200K Fine',   color: '#f43f5e', type: 'tax',    amount: 200000, desc: 'Global Carbon Tax Audit! Pay 200K into Festival Pool.' },
  { label: '+250K Bonus',  color: '#facc15', type: 'cash',   amount: 250000, desc: 'Tech Unicorn Dividend! Collect 250K!'                  },
  { label: 'Go to Island', color: '#fb923c', type: 'island',                 desc: 'Stormy Seas! Detained on Tropical Island!'              },
  { label: 'World Tour!',  color: '#a855f7', type: 'move',   target: 24,     desc: 'VIP Ticket to World Tour Airport!'                     },
];

export const RAJASTHAN_CHANCE_WHEEL_PRIZES = [
  { label: '+400K Grant',  color: '#4ade80', type: 'cash',   amount: 400000, desc: 'Royal Heritage Trust Grant! Collect 400K!'             },
  { label: 'Fly to START', color: '#38bdf8', type: 'move',   target: 0,      desc: 'Royal Express to START! Collect +300K!'                },
  { label: '-200K Fine',   color: '#f43f5e', type: 'tax',    amount: 200000, desc: 'Fort Preservation Audit! Pay 200K into Festival Pool.' },
  { label: '+250K Bonus',  color: '#facc15', type: 'cash',   amount: 250000, desc: 'Marwar Trade Syndicate Dividend! Collect 250K!'        },
  { label: 'Go to Island', color: '#fb923c', type: 'island',                 desc: 'Thar Dust Storm! Detained at Desert Retreat!'          },
  { label: 'World Tour!',  color: '#a855f7', type: 'move',   target: 24,     desc: 'VIP Ticket to Royal Express Station!'                   },
];

export const BOARD_EDITIONS = {
  world: {
    id: 'world',
    name: 'World Cities',
    badge: 'World Tour Edition',
    tilesLabel: '32 Global Cities',
    groupMeta: WORLD_GROUP_META,
    tiles: WORLD_BOARD_TILES,
    chancePrizes: WORLD_CHANCE_WHEEL_PRIZES
  },
  rajasthan: {
    id: 'rajasthan',
    name: 'Rajasthan, India',
    badge: 'Rajasthan Edition',
    tilesLabel: '32 Royal Cities & Heritage',
    groupMeta: RAJASTHAN_GROUP_META,
    tiles: RAJASTHAN_BOARD_TILES,
    chancePrizes: RAJASTHAN_CHANCE_WHEEL_PRIZES
  }
};

export const GROUP_META = { ...WORLD_GROUP_META };
export const BOARD_TILES = WORLD_BOARD_TILES.map(t => ({ ...t }));
export const CHANCE_WHEEL_PRIZES = WORLD_CHANCE_WHEEL_PRIZES.map(p => ({ ...p }));

/**
 * Switch active board edition in-place so all imported references remain intact.
 * @param {string} editionId - 'world' | 'rajasthan'
 */
export function applyBoardEdition(editionId) {
  const edition = BOARD_EDITIONS[editionId] || BOARD_EDITIONS.world;

  // In-place update of GROUP_META
  Object.keys(GROUP_META).forEach(k => delete GROUP_META[k]);
  Object.assign(GROUP_META, edition.groupMeta);

  // In-place update of BOARD_TILES
  BOARD_TILES.length = 0;
  edition.tiles.forEach(t => BOARD_TILES.push({ ...t }));

  // In-place update of CHANCE_WHEEL_PRIZES
  CHANCE_WHEEL_PRIZES.length = 0;
  edition.chancePrizes.forEach(p => CHANCE_WHEEL_PRIZES.push({ ...p }));

  return edition;
}

export const PLAYER_THEMES = [
  { name: 'YOU',     colorHex: '#3b82f6', charColor: 0x3b82f6, hatColor: 0x334155, isAI: false },
  { name: 'BIDIK',   colorHex: '#fb923c', charColor: 0xf97316, hatColor: 0xfde047, isAI: true  },
  { name: 'ATLAS',   colorHex: '#22c55e', charColor: 0x22c55e, hatColor: 0x1e293b, isAI: true  },
  { name: 'NOVA',    colorHex: '#ec4899', charColor: 0xec4899, hatColor: 0xffffff, isAI: true  },
  { name: 'PHOENIX', colorHex: '#ef4444', charColor: 0xef4444, hatColor: 0xf97316, isAI: true  },
  { name: 'CYBER',   colorHex: '#06b6d4', charColor: 0x06b6d4, hatColor: 0x38bdf8, isAI: true  },
];
