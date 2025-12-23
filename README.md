# KILL LIST

A John Wick-themed productivity PWA built with SvelteKit. Execute your tasks with ruthless efficiency.

## Features

- **Local-First Database**: IndexedDB via Dexie.js for instant, offline-capable storage
- **GPU-Accelerated Swipe**: Swipe right to complete tasks with buttery smooth 60fps animations
- **Spacebar Trigger** (Desktop): Hold spacebar to charge, release to execute the top contract
- **Cinematic Oath Screen**: Blood oath ritual that unlocks Web Audio
- **PWA Ready**: Install as a standalone app on mobile and desktop

## Tech Stack

- **Framework**: SvelteKit 2 with TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Dexie.js (IndexedDB wrapper)
- **Audio**: Web Audio API (synthesized sounds)
- **Build**: Vite

## Installation

```bash
# Remove old Next.js dependencies
rm -rf node_modules package-lock.json

# Install fresh dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
src/
├── lib/
│   ├── db.ts                    # Dexie IndexedDB configuration
│   ├── audio.ts                 # Audio manager singleton
│   ├── stores/
│   │   └── contracts.ts         # Svelte stores with optimistic updates
│   └── components/
│       ├── ContractCard.svelte  # Swipeable task card
│       ├── OathScreen.svelte    # Cinematic onboarding
│       └── TriggerIndicator.svelte # Spacebar charge UI
├── routes/
│   ├── +layout.svelte           # Global layout + keyboard bindings
│   └── +page.svelte             # Main contracts list
├── app.html                     # HTML template with PWA meta
└── app.css                      # Global styles + Tailwind
```

## Design System

- **Background**: `#050505` (Obsidian Black)
- **Accent**: `#D4AF37` (Continental Gold)
- **Danger**: `#DC2626` (Blood Red)
- **Surface**: `#1A1A1A` (Gunmetal)
- **Typography**: Cinzel (headings), JetBrains Mono (body)

## Performance Optimizations

1. **Optimistic Updates**: UI updates instantly, DB writes async
2. **GPU Compositing**: `transform: translate3d()` + `will-change: transform`
3. **Touch Optimization**: `touch-action: pan-y` prevents scroll jank
4. **Lazy Audio**: AudioContext only created after user interaction

## PWA Installation

The app can be installed as a PWA:
- **iOS**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu → Install App
- **Desktop**: Chrome → Address bar install icon

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run check    # Type check
```

## License

MIT
