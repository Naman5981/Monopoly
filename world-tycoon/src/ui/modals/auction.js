/**
 * ui/modals/auction.js
 * Deactivated legacy auction module (feature permanently removed).
 * Safe no-op stubs preserved for backwards compatibility.
 */

import { gameState } from '../../game/state.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

export function startCityAuction() {
  updateModalSlice('auction', { visible: false });
  gameState.auction = null;
}

export function updateAuctionModalUI() {}

export function placeAuctionBid() {}

export function passAuctionBid() {}
