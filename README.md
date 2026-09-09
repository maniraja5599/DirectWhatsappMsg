# FiFTO WhatsDirect — Chat Without Saving Contacts

Mobile-first web app to open a WhatsApp chat for any mobile number, with an
optional prefilled message and reusable saved messages. Private by design:
numbers, clipboard contents and messages never leave the device.

## Stack

- React 19 + TypeScript + Vite (no UI framework, vanilla CSS for speed)
- `localStorage` persistence, no backend
- PWA-ready: manifest, icons, theme-color, viewport-fit, offline service worker

## Run

```sh
npm install
npm run dev      # local dev
npm run preview  # serve the production build
npm run build    # typecheck + production build
npm test         # vitest unit tests (30 tests)
npm run lint     # oxlint
```

## How it works

1. Enter a number (country code defaults to India +91) or tap **Paste Number**.
   If the number carries a country code (`+1`, `+44`…), the selector
   switches to it automatically. **Copied a number already?** When clipboard
   access was previously granted, the app pastes it by itself when you open
   or return to it (never overwriting what you typed, never claiming a read
   that didn't happen). Otherwise the Paste button glows gently — one tap.
   Clipboard is only ever read on-device; permission is never requested
   silently — if unavailable/denied/empty the app shows a friendly fallback
   (long-press → Paste).
2. Optionally tap **Add a message** and pick a saved message or type one.
   Need a new reusable message? The dropdown has **＋ Add new message…**,
   which opens **Settings ⚙️** — all saved messages live there
   (create, use, edit, copy, delete), only in this browser.
3. Tap **WhatsApp** or **Business** — or just press **Enter** (mobile
   keyboard **Go**) in the number field — to open the chat. Enter reuses
   whichever app you picked last (remembered on-device). The app validates,
   normalizes to `wa.me/<digits>`, appends `?text=<encodeURIComponent(message)>`
   when non-empty. On Android Chrome the chosen app is targeted
   explicitly (`com.whatsapp` / `com.whatsapp.w4b`) with automatic fallback
   to WhatsApp Web when it isn't installed; elsewhere the OS handles the
   `wa.me` link. (Bonus: Ctrl/Cmd+Enter sends from the message box.)

## Install as an app (PWA)- Real PNG icons + manifest + offline service worker included.
- Android Chrome: tap the **⬇ Install App** button in the header
  (or browser menu → Install app / Add to Home screen).
- iPhone Safari: Share → Add to Home Screen.
- For phone testing on the same Wi-Fi: run `npm run dev` on the PC and open
  the PC's LAN address (e.g. `http://192.168.x.x:5173/`) in the phone browser.

## Theme

- Header 🌙/☀️ toggle switches dark/light manually.
- Choice persists in `localStorage` (`wa-direct:theme`); first visit follows
  the OS setting. Applied pre-paint, so no theme flash.

Number normalization strips spaces, hyphens, brackets and other formatting,
handles `+`, `00` prefixes and Indian trunk `0`, and never blindly prepends
the default code when the number already includes it.

## Project layout

```
src/
  App.tsx                    # 3-step flow + saved-messages section
  components/
    CountryCodeSelector.tsx
    MessageEditor.tsx        # create/edit modal
    SavedMessageCard.tsx
    Toast.tsx
  lib/
    phone.ts                 # normalizePhoneNumber, extractPhoneFromText
    whatsapp.ts              # buildWhatsAppUrl
    clipboard.ts             # readClipboardText (permission-safe)
    storage.ts               # localStorage CRUD for saved messages
    __tests__/               # vitest coverage for the above
public/
  manifest.webmanifest, favicon.svg, icon-*.svg, sw.js
```
