// Shared mutable state — imported as a single object so all modules mutate the same reference
export const state = {
  currentSkinUrl:    null,
  currentPlayerName: null,
  currentUuid:       null,
  skinHeight:        64,
  skinIsLegacy:      false,
  skinIsSlim:        false,
};
