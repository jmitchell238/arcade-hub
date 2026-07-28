'use strict';

// ---- Version (MAJOR.MINOR.PATCH) --------------------------------------------
// Shown in the UI as "Arcade Hub vMAJOR.MINOR.PPP" (patch zero-padded to 3 digits).
//   major — breaking / generation changes
//   minor — features (big UI, catalog systems)
//   patch — bugfixes, polish, catalog asset tweaks
// Keep CACHE in sw.js in sync: 'arcade-hub-' + HUB_VERSION
const HUB_VERSION = '1.1.041';
const HUB_VERSION_LABEL = 'v' + HUB_VERSION;
const HUB_NAME = 'Arcade Hub';
// Alias so shared version-check patterns that look for GAME_VERSION still work
const GAME_VERSION = HUB_VERSION;
const GAME_VERSION_LABEL = HUB_VERSION_LABEL;
