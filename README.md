# Happy Birthday Levi! 🎂

An 8-bit birthday-present delivery system. Levi runs through **Birthday Boulevard** (a Mario-style platformer),
opens his present (Chick-fil-A e-gift card), then gets ambushed by a **secret bonus round** (a flappy flying-car level)
that ends in the Wingstop e-gift card. Built for phones, works on desktop too.

Everything is plain HTML/JS — no build step, no dependencies. All music and sound effects are synthesized in the
browser with the Web Audio API (no audio files).

## Files

| File | What it is |
|---|---|
| `config.js` | **The only file you need to edit.** Name, sender, amounts, and the two gift-card links. |
| `index.html` | Page, styles, overlay screens (title, intros, prize reveals), on-screen controls. |
| `js/game.js` | The game engine: sprites, physics, both levels, screen flow. |
| `js/audio.js` | Chiptune engine: sound effects, music sequencer, the songs. |
| `assets/levi-head.png` | Levi's head, cut out from the photo (generated from `images/head-new.png`). |
| `images/` | Source photos — not needed to run the game and ignored by git. |

## Put in the real gift-card links

Open `config.js` and paste the e-gift links into `url` for `chickfila` and `wingstop`. Either paste the plain link, or
(so he can't just "view source" to find the prizes) paste a base64 version prefixed with `b64:`.
To make one, open any browser console and run:

```js
btoa('https://www.example.com/your-egift-link')
```

then set `url: 'b64:PASTE_THE_RESULT_HERE'`. This is obfuscation, not security — fine for a birthday game.

Also in `config.js`: `name`, `from` (shows on the final screen), `amount` per card, and `finalMessage`.

## Test it locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765 — or on your phone, `http://<your-computer's-IP>:8765` on the same Wi-Fi.
Keyboard works on desktop: arrows / WASD to move, Space to jump or flap.

Adding `#debug` to the URL exposes `window.__levi` (player, state, etc.) for poking around.

## Deploy to GitHub Pages

1. Create a new **public** repository on GitHub (e.g. `happybdaylevi`).
2. Push this folder:
   ```bash
   git init
   git add .
   git commit -m "Happy birthday Levi"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/happybdaylevi.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, branch `main`, folder `/ (root)`. Save.
4. A minute later it's live at `https://YOUR-USERNAME.github.io/happybdaylevi/`.

### Custom domain (HappyBdayLevi.com)

1. At your domain registrar, add DNS records:
   - `A` records for the root (`@`) pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` pointing to `YOUR-USERNAME.github.io`
2. In GitHub **Settings → Pages → Custom domain**, enter `happybdaylevi.com` and save (this creates a `CNAME` file in the repo).
3. Wait for the DNS check to pass, then tick **Enforce HTTPS**. DNS can take from minutes to a day to propagate.

## Notes

- Progress is saved in the browser (`localStorage`), so once Levi beats a level the title screen gets a **🎁 MY PRIZES**
  button — he can always get back to the card links even if he closes the tab. If he beat level 1 but not the bonus round,
  a **▶ BONUS ROUND** shortcut appears too.
- Sound starts on the first tap (browsers require a user gesture before audio). The **♪** button toggles music.
- The "Happy Birthday to You" melody used at the present reveal has been public domain since 2016. The font is
  [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (Open Font License), loaded from Google Fonts.
- The head image is the only external asset; to swap it, replace `assets/levi-head.png` with any transparent PNG of a head facing right.
