# plant-panel-ui

A Svelte 5 + Tauri 2 desktop front end for [plantd](../plant-panel). It shows every
plant's moisture, status and next watering at a glance, with history charts, the
forecast curve, events and the daily report.

It is plain Svelte + Vite with a hash router, not SvelteKit: four screens, no SSR,
and a single static `dist/` that runs both inside Tauri and in a plain browser. That
means plantd can later serve the same build from the Pi.

```
src/
  lib/icd.ts            TypeScript mirror of the plantd ICD v1 (keep in step with plant-icd)
  lib/api.ts            typed client; Tauri HTTP plugin inside the app, fetch in a browser
  lib/state.svelte.ts   server setting, live plant list (60 s refresh), router
  lib/format.ts         time / percent formatting, labels
  lib/photo.ts          downscale before upload; cached object URLs for plant photos
  lib/components/       Chart (SVG, no chart lib), PlantCard, PlantEditor, PlantPhoto, ...
  views/                Dashboard, PlantView, EventsView, ReportView, SettingsView
src-tauri/              minimal Rust shell: window + tauri-plugin-http
```

## Prerequisites (Debian)

```sh
# Tauri's Linux webview + build deps
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libsoup-3.0-dev libdbus-1-dev build-essential pkg-config libssl-dev

# Node 22+ (any install method; nvm shown)
nvm install --lts
```

Rust comes from rustup, the same as for plant-panel.

## Run

```sh
npm install
npm run tauri dev        # desktop app with hot reload
npm run dev              # or just the UI in a browser at http://localhost:1420
npm run check            # svelte-check / TypeScript
npm run tauri build      # release bundle (.deb/.AppImage here; .msi/.exe on Windows)
```

The server defaults to `http://ngspthree.local:8080`; change it under **Settings**.
plantd sends `Access-Control-Allow-Origin: *`, so the browser-only mode works against
the Pi too.

## Notes

- **Transport:** inside Tauri, requests go through `@tauri-apps/plugin-http` (Rust).
  That sidesteps webview CORS and mixed-content rules, and resolves mDNS `.local`
  names through the OS. The capability (`src-tauri/capabilities/default.json`) allows
  any `http(s)` host because the server address is user-configured.
- **Charts** are hand-rolled SVG. Range queries use plantd's `step=` downsampling, so
  any range is about 300 points. The dashed curve is the fitted drydown model
  projected from the latest reading (`project()` in `icd.ts`, the same formula as
  plantd's).
- **Plant edits** (name, notes, dry threshold, photo) are stored by plantd, so every
  instance of the app sees them on its next refresh. Photos are re-encoded to a
  ≤ 1024 px JPEG before upload and shown from blob URLs, which is why the CSP allows
  `img-src blob:`.
- **Icons** in `src-tauri/icons/` are generated placeholders. Replace them with
  `npm run tauri icon path/to/1024.png`.
- **Windows:** builds natively with `npm run tauri build` (needs WebView2, which ships
  with Windows 11).
