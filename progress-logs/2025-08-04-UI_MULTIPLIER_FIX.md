# 2025-08-04 - UI Multiplier Fix

## Problem
Lightning bolt multiplier (⚡) in UI was resetting to 1.0x on platform landings despite combo system still being active.

## Root Cause
Two separate multiplier systems running in parallel:
- **ScoreSystem** (old/simple) - Resets multiplier on any platform landing
- **ComboSystem** (new/sophisticated) - Properly maintains combos across platform interactions

UI was displaying ScoreSystem multiplier instead of ComboSystem multiplier.

## Solution
Changed `GameUI.ts:183` to use `comboSystem.getCurrentMultiplier()` instead of `currentScore.multiplier`.

## Result
- Multiplier now persists when bouncing off platforms
- Only resets on actual combo timeout (2.5s inactivity)
- Maintains proper combo behavior for wall bounces and platform interactions

## Files Modified
- `src/game/GameUI.ts` - Line 183: Use ComboSystem multiplier

## Technical Debt
ScoreSystem still contains old combo logic (`onPlayerLanded()`, `resetCombo()`, etc.) that may be redundant now that ComboSystem is the primary combo handler.