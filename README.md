# 🌋 Rising Lava Obby

A zero-dependency HTML5 Canvas vertical tower climber where younger and older kids practice multiplication on equal competitive terms.

**Play Live:** [https://arkalon76.github.io/mathislava/](https://arkalon76.github.io/mathislava/)

## Features

- **Zero Dependencies & Offline-Ready:** Pure `index.html`, `styles.css`, `app.js`, and Web Audio API sound effects—no build tools, bundlers, or external files.
- **Equal-Terms Weight Classes:**
  - **Player 1 — Junior Class:** Comfort `[2, 3, 4, 5, 10]`, Target `[6, 7]`, standard `a × b = ?` facts, `0.78 m/s` baseline lava speed.
  - **Player 2 — Pro Class:** Comfort `[6, 7, 8, 9, 11, 12]`, Target `[13, 14]`, `65%` standard + `35%` missing-factor (`? × 8 = 72`), `1.25 m/s` baseline lava speed.
  - *(Customize player names locally per device by holding `⚙️ Parent` for `1.1s`.)*
- **Single-Table Focus Mode:** Pick `⚡ All Mix` or tap any single number (`2×`–`15×`, such as `8×`) right on the Lobby screen to drill only that times table during the climb.
- **Real-Time Ghost Rival:** Records your personal best climb every `0.5s` so your sibling's translucent blocky avatar races alongside you with comic speech bubbles.
- **Anti-Frustration Learning Deck (`70 / 20 / 10`):**
  - `70%` Comfort tables for fast streaks (`+4 m` jump, `+8 m` every 5-streak).
  - `20%` Target/New tables with an automatic **5-Second Cryo-Freeze** whenever an unmastered fact (`right < 3`) appears.
  - `10%` **Golden Boss** (`+12 m` Rocket Jump) for previously missed facts.
  - **Jetpack Assist Hints** appear after `3.8s`, and wrong answers trigger a slapstick **Banana Peel Slip** (`-2 m`) + easy recovery question instead of instant death.
- **4 Vertical Biomes (every 50 m):** Noob Kitchen (Tomato Soup), Wacky Construction (Nacho Cheese + `+8 m` Trampolines), Mad Scientist Lab (Radioactive Slime), and Low Earth Orbit (Plasma Nebula).
- **6 Unlockable Hats:** Earned by cumulative distance (`0 m` to `750 m`), including Traffic Cone, Spinning Propeller Cap, Rubber Chicken, Astronaut Fishbowl, and Flaming Crown.
- **Parent Calibration & `12×12` Heatmap:** Press and hold `⚙️ Parent` for `1.1s` to edit player profiles, switch weight classes, toggle `2×–15×` tables, and inspect the color-coded mastery grid.

## Controls

- **iPad / Touch:** Use the custom on-screen numpad (`0–9`, `⌫`, `JUMP!`). Native `<input>` fields are never focused during gameplay so the iPadOS keyboard stays hidden.
- **Desktop Keyboard:** Type digits `0–9`, `Backspace`/`Delete` to erase, and `Enter` or `Space` to jump.

## Run Locally

Start any static HTTP server in the project folder:

```bash
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765).

## Free & Simple Hosting Options

Because Rising Lava Obby is 100% static (`index.html`, `styles.css`, `app.js`), it can be hosted for free in under two minutes:

### Option 1: GitHub Pages (Best for automatic updates)
1. Create a new GitHub repository (public or private on supported plans) and push `index.html`, `styles.css`, `app.js`, and `README.md` to `main`.
2. Open the repository on GitHub and go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**, select **`main`** and **`/ (root)`**, and click **Save**.
4. Your live HTTPS URL (`https://<username>.github.io/<repo>/`) will be ready in ~1 minute.

### Option 2: Cloudflare Pages or Netlify Drop (Fastest drag-and-drop)
- **Cloudflare Pages:** Connect the GitHub repo (or upload the folder directly in Workers & Pages → Create → Pages → Upload assets) with no build command and output directory `/`.
- **Netlify Drop:** Visit [https://app.netlify.com/drop](https://app.netlify.com/drop) and drag this folder straight onto the page for an instant live URL.

### iPad Home Screen Install (Full-Screen Mode)
1. Open the hosted HTTPS URL in **Safari** on the iPad.
2. Tap the **Share** button (`□↑`) and choose **Add to Home Screen**.
3. Launch **Rising Lava Obby** from the Home Screen icon for full-screen gameplay without browser bars.

## License

Licensed under the [MIT License](LICENSE).
