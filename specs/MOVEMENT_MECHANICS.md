---

# **Icy Tower Clone: Essential Gameplay & Mechanics Design Specification**

---

## **1. Core Movement & Momentum**

* **Horizontal Acceleration:**

  * Player accelerates smoothly when moving left/right; top running speed is high enough to allow dramatic jumps.
  * Movement is not instant—speed builds with time spent running, and dissipates gradually, not immediately.
  * “Slippery”/low-friction physics: Let go of direction, and player slides to a stop.

* **Jumping:**

  * Jump is always the same vertical power, but horizontal speed is preserved during takeoff.
  * The distance and height covered by a jump are strongly influenced by the player’s current horizontal velocity.
  * Player can only jump when standing on a platform (no air jumps, double jumps, or coyote time).

* **Momentum Chaining:**

  * Maintaining horizontal speed across multiple jumps is essential for chaining combos and climbing quickly.
  * Landing with speed should feel “bouncy” and fluid—landing should not zero or heavily dampen horizontal speed.
  * Reversing direction or stopping loses momentum and should reset the “combo window.”

You’re right—true Icy Tower physics don’t treat vertical and horizontal components as entirely independent. Instead, horizontal momentum actually *boosts* your vertical take-off. Here’s how to model that cleanly:

---

## Coupled Jump Formula

Let:

* $v_x$ = your current horizontal speed at jump time
* $v_{y0}$ = base vertical jump speed (what you get from a stand-still jump)
* $k$ = momentum coupling factor (tunes how much horizontal speed adds vertical power)

Then your *actual* jump speed is:

$$
v_y = v_{y0} \;+\; k\,|v_x|
$$

* If $k=0$, you get no boost (purely fixed vertical jump).
* If $k=1$, you convert all your horizontal speed into extra vertical speed (overkill).
* In practice, **$k$** lives somewhere around **0.2–0.4** for a satisfying feel.

---

## Effects on Flight

1. **Time of flight**

   $$
   T = \frac{2\,v_y}{g}
   $$
2. **Max height**

   $$
   H = \frac{v_y^2}{2g}
   $$
3. **Horizontal range**

   $$
   R = v_x \times T
   $$

By making $v_y$ grow with $|v_x|$, both your airtime $T$ and height $H$ increase as you build speed—so you *really* feel that “running start” powers you higher.

---

## Example Numbers (with $g=10$,m/s²)

| Scenario       | $v_x$ | $v_{y0}$ | $k$ |     $v_y$     | $T$ (s) | $H$ (m) |
| -------------- | :---: | :------: | :-: | :-----------: | :-----: | :-----: |
| Stand-still    |   0   |    10    | 0.3 |  $10 + 0=10$  |   2.00  |   5.00  |
| Moderate speed |   5   |    10    | 0.3 | $10+1.5=11.5$ |   2.30  |   6.61  |
| High speed     |   15  |    10    | 0.3 | $10+4.5=14.5$ |   2.90  |  10.51  |

* At **15 m/s**, you now rise more than twice as high as a stand-still jump.
* **Height** scales with $(v_{y0}+k\,v_x)^2$, so mastering speed yields *exponentially* better vertical reach.

---

## Tuning Guidance

* **Start** with $v_{y0}$ that feels good at slow speeds.
* **Set** $k$ low (0.2) and increase until players can skip a satisfying number of platforms at top speed.
* **Test** jump arcs at various speeds to ensure gaps are neither trivial nor impossible at each difficulty stage.

---

### Why This Matters

* **Skill Expression:** Players who chain running jumps feel rewarded with genuinely higher launches.
* **Combo Depth:** Higher vertical reach unlocks more platform skips and longer combos.
* **Arcade “Pop”:** That moment when your run crescendos into a huge leap is core to the game’s thrill.

---

Integrating horizontal momentum into vertical jump power is the secret sauce that makes Icy Tower’s movement feel *alive*—you’ll want to nail this coupling before anything else.



----


  Core Player Mechanics

    Jump window rules (timing, coyote time, jump buffering)

    Air control limits (how much, when, max speed in air)

    Collision forgiveness (for landing, platform edges)

    Input buffering and repeat rate (jump, left/right)

    Death conditions (how/when the player dies, e.g., fall off, outpaced by scroll)

Platform/World Mechanics

    Platform spawn logic (distribution, spacing, types if any)

    Platform despawn logic (when and how old platforms are removed)

    Platform collision bounds (precise size, hitbox leniency)

    Screen/camera scroll rate rules (start speed, ramping, acceleration curve)

Combo & Scoring Mechanics

    Combo window timing (how long between jumps keeps a combo alive)

    Combo loss/reset rules (when and how a combo breaks)

    Scoring formula (per platform, per combo, multipliers)

    Combo feedback and display (UI, visual/audio cues)

Game Progression Mechanics

    Scroll speed ramp (increase logic, limits)

    Difficulty curve (how game becomes harder)

    Run/retry logic (instant restart, state reset)

Feedback/Presentation Mechanics

    Animation and squash/stretch rules (for movement, jump, land)

    Audio cue triggers (for jump, land, combo, death)

    Visual effects for combos (popups, trails, particles)

    UI elements (what is always visible, where, style requirements)


---

## **2. One-Way Platform Collisions**

* **Platforms are “one-way”:**

  * Player passes through platforms from below while jumping upward.
  * Collisions only occur when the player is falling down onto a platform, not when ascending.
  * Platforms are wide enough to encourage running starts; spacing and randomness is such that skilled jumps can skip several at once.

* **Landing Rules:**

  * Collisions with platforms only count if the player’s vertical movement is downwards and their position is above the platform.
  * Landing always re-enables jump; no mid-air resets.

---

## **3. Combo System**

* **Combo Definition:**

  * A combo is performed by skipping one or more platforms in a single jump, or by chaining multiple jumps that each skip platforms, without stopping or “breaking the flow.”
  * Combos are tracked by counting how many platforms were passed over since the last landing.

* **Scoring:**

  * Score increases with each platform landed on; bigger combos (skipping more platforms) are worth exponentially more.
  * Combo multiplier resets if the player stops, reverses, or lands on every platform without skipping.

* **Feedback:**

  * Combos should be **visually and audibly rewarding**: popups, sounds, and animation effects for big combos.
  * Show current combo and best combo on UI.

---

## **4. Auto-Scrolling & Time Pressure**

* **Vertical Auto-Scroll:**

  * The camera or world scrolls upward at a speed that gradually increases over time.
  * The player must keep moving upward—if they fall below the bottom of the screen (or “death line”), the game ends.
  * No ability to slow or stop the scroll.

* **Rising Challenge:**

  * Scroll speed ramps up as player progresses, increasing pressure and difficulty.

---

## **5. Platform Generation & Variety**

* **Procedural Placement:**

  * Platforms are generated procedurally, with randomized horizontal position and vertical spacing within constraints.
  * There is always a viable (but not always easy) path upward, but skilled players can exploit wider gaps for larger combos.
  * Gaps, platform widths, and heights are tuned for high-speed play—platforms are never so close that “jumps” become trivial, nor so far that jumps are impossible at top speed.

* **No Hazards:**

  * The only hazard is falling out of view (no enemies, spikes, or moving platforms in the base design).

---

## **6. Game Flow & Responsiveness**

* **Fast Restarts:**

  * When the player fails, restart is immediate—no long animations or screens between runs.
  * Highscore is tracked and immediately shown.

* **Minimal Input Lag:**

  * Input should be as close to “real time” as possible. Avoid animation delays or input buffering.

* **Simple Controls:**

  * Only left, right, and jump. No wall jumps, double jumps, or complex combos.

---

## **7. Visual & Audio Feedback**

* **Immediate Feedback:**

  * Every platform landed on, combo scored, or milestone reached gives visual and audio cues.
  * Movement and jumping should “feel” fast, energetic, and impactful, with squash/stretch or similar animations.

* **Clarity:**

  * The player, platforms, and score/combo UI are always clear and visible, with no visual clutter.

---

## **8. Difficulty & Skill Curve**

* **Easy to Try, Hard to Master:**

  * Anyone can jump a few platforms, but mastery comes from maintaining momentum and maximizing combos under increasing speed and pressure.

* **No Random Deaths:**

  * Platform placement and scroll speed should always give a fair chance, no unavoidable gaps or unfair patterns.

---

## **9. Core “Feel” Principles**

* **Speed and Flow:**

  * The game is fast-paced—player and camera movement is brisk.
  * There is a satisfying “flow state” possible when chaining jumps and combos, rewarding quick reflexes and precise timing.

* **Reward Skill, Not Luck:**

  * High scores come from skillful management of momentum, timing, and risk-taking with big combos.

---

# **Summary Table**

| System      | Essential Rules                                                             |
| ----------- | --------------------------------------------------------------------------- |
| Movement    | Accelerate with input, low drag, high max speed, momentum preserved on jump |
| Jumping     | Jump power fixed, horizontal speed preserved, no air jumps                  |
| Platforms   | One-way collision, only land when falling, procedural spacing               |
| Combos      | Skipping platforms increases multiplier, resets if stop/reverse/land-every  |
| Auto-Scroll | Constant upward pressure, death below screen, speed increases               |
| Restart     | Instant after fail, highscore shown immediately                             |
| Controls    | Left, right, jump only, ultra responsive                                    |
| Feedback    | Big audio/visual cues for combos, clear UI                                  |
| Difficulty  | Starts accessible, ramps to fast and hard, never unfair                     |

---

**If these rules are followed precisely, you will capture the arcade “flow” and depth that made Icy Tower a classic.**
The *core* is maintaining and exploiting momentum for ever-bigger combos, under time pressure, with every jump feeling high-stakes and rewarding skillful, fluid play.
