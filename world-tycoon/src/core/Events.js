/**
 * core/Events.js
 * Strongly-typed semantic event constants for World Tycoon.
 * Adheres to Clean Code principles: Searchable Names and Zero Magic Strings.
 */

export const GameEvents = Object.freeze({
  // Lifecycle
  MATCH_INIT: 'game:match_init',
  MATCH_STARTED: 'game:match_started',
  MATCH_TERMINATED: 'game:match_terminated',
  VICTORY: 'game:victory',

  // Turn Cycle
  TURN_STARTED: 'turn:started',
  TURN_PHASE_CHANGED: 'turn:phase_changed',
  TURN_ENDED: 'turn:ended',
  TURN_TIMEOUT: 'turn:timeout',

  // Dice & Movement
  DICE_ROLL_REQUESTED: 'dice:roll_requested',
  DICE_TUMBLED: 'dice:tumbled',
  TOKEN_HOP_STEP: 'token:hop_step',
  TOKEN_LANDED: 'token:landed',

  // Financial & Properties
  CASH_CHANGED: 'player:cash_changed',
  PROPERTY_PURCHASED: 'property:purchased',
  PROPERTY_UPGRADED: 'property:upgraded',
  PROPERTY_BOUGHT_OUT: 'property:bought_out',
  RENT_PAID: 'property:rent_paid',
  FESTIVAL_BOOSTED: 'property:festival_boosted',

  // Special Landmarks & Detentions
  ISLAND_ENTERED: 'island:entered',
  ISLAND_ESCAPED: 'island:escaped',
  FESTIVAL_POT_WON: 'festival:pot_won',
  FLIGHT_STARTED: 'flight:started',
  FLIGHT_LANDED: 'flight:landed',
  CHANCE_TRIGGERED: 'chance:triggered',

  // UI & Feedback
  STATUS_PILL_UPDATED: 'ui:status_pill_updated',
  EVENT_LOGGED: 'ui:event_logged',
  SPEECH_BUBBLE_REQUESTED: 'ui:speech_bubble_requested',
  TOAST_NOTIFICATION: 'ui:toast_notification',
  AUDIO_PLAY_SFX: 'audio:play_sfx'
});
