# 2025-08-04 - Biome Reset Bug

## Problem
Biomes don't reset properly when the game dies/restarts. Sometimes requires 2 resets to fully work.

## Root Cause Investigation
BiomeManager lifecycle during game reset:
- `destroy()` called during scene cleanup, removes event listeners
- Custom reset recreates BiomeManager and emits `'game-fully-reset'` event
- Timing issues between destruction/recreation and event emission

## Attempted Fix
Modified `reinitializeGameSystems()` in `Game.ts` to:
1. Recreate BiomeManager before emitting reset event
2. Use `setPlatformCount(0)` to force reset if BiomeManager exists
3. Emit `'game-fully-reset'` after managers are ready

## Current Status
**Still broken** - inconsistent reset behavior persists.

## Technical Debt
The custom reset system (`resetGameSystems()`) vs. full scene restart creates complex state management. BiomeManager expects clean initialization but gets caught in partial reset states.

## Files Modified
- `src/game/scenes/Game.ts` - Enhanced `reinitializeGameSystems()`

## Next Steps
Consider simplifying reset logic or investigating BiomeManager event listener lifecycle.