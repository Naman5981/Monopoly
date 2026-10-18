/**
 * ui/modals/buyUpgrade.js
 * Clean Code SRP Facade barrel re-exporting specialized property modules:
 * - buyCity.js: Purchasing unowned properties and resorts
 * - buyoutCity.js: Hostile buyout acquisitions
 * - sellRent.js: Rent debt liquidation and bankruptcy handling
 * - upgradeCity.js: In-visit property upgrading (Cottages, Villas, Manors, Skyscrapers)
 */

export * from './buyCity.js';
export * from './buyoutCity.js';
export * from './sellRent.js';
export * from './upgradeCity.js';
