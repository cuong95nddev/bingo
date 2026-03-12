# Admin UI Redesign — Design Doc
Date: 2026-03-12

## Goal
Redesign `frontend/src/pages/AdminPage.tsx` from a basic dark-gray tabbed layout into a professional dashboard-style admin panel with a fixed sidebar, KPI stat cards, and polished component styling.

## Dependencies
- Add `lucide-react` to `frontend/package.json` for sidebar and section icons.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  ▐ Bí Ngô 88 Admin          [admin]  [Đăng xuất]   │
├──────────────┬──────────────────────────────────────┤
│              │  KPI Cards                           │
│  ⚡ Game     │                                      │
│  👥 Players  │  Tab content area                    │
│  ⚙ Config   │                                      │
│  📋 History  │                                      │
└──────────────┴──────────────────────────────────────┘
```

- Full-height fixed sidebar (~240px), content area fills remaining width
- Top header bar with brand name, admin label, logout button

## Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| page bg | `slate-950` | outermost background |
| sidebar bg | `slate-900` | sidebar panel |
| card bg | `slate-800` | content cards |
| primary accent | `indigo-600` | active nav item, primary buttons |
| success | `emerald-*` | game running status, add coins |
| warning | `amber-*` | jackpot, coins display |
| danger | `red-*` | hacker, reset, error states |

## Login Screen
- `slate-950` full-page background
- Centered card (`slate-900`, rounded-2xl, border `slate-700`)
- Shield icon (lucide) above title
- Focus ring uses `indigo-500`
- Error text in `red-400`

## Sidebar
- `slate-900` background, full height
- Brand logo area at top (game icon + "Bí Ngô 88 Admin")
- Nav items: icon + label, `slate-800` hover, active item has `indigo-600` left border + `indigo-500` text + `slate-800` bg
- Player count badge on Players nav item (live count)
- Bottom: logout button

## KPI Stat Cards
Three cards rendered at the top of the main content area regardless of active tab:
1. **Online Players** — player count with user icon
2. **Game Status** — colored badge (gray=waiting, green=betting, blue=drawing, yellow=result)
3. **Total Rounds** — count from history length

Cards use `slate-800` bg, subtle top border in accent color per card.

## Game Tab
- Start Game card: large primary button, status display
- Reset card: destructive styling
- Hacker section: `slate-800` card with `red-500/20` left border, inputs in grid
- Jackpot section: `slate-800` card with `amber-500/20` left border, inputs in grid
- Result banners appear inline below each action button

## Players Tab
- Toolbar: player count, refresh button, coin amount input right-aligned
- Table: `slate-800` header row, zebra striping (`slate-800/50` odd rows), sticky header
- Coins column: `amber-400` text, coin emoji badge
- Actions column: three small buttons (add/set/reset) aligned right

## Config Tab
- Form sections grouped in labeled cards
- Each field: label + helper text + input
- House fee section separated with a card border and toggle
- Save button: `indigo-600` primary, full width at bottom

## History Tab
- Timeline list: each entry is a card row
- Left: round `#ID` in muted text
- Center: dice emoji sequence + sum badge (`slate-700` bg, white text)
- Right: timestamp in `slate-500`

## What Does NOT Change
- All API calls, state management, data fetching logic — zero business logic changes
- The 3-second polling interval
- Vietnamese text strings
- Password authentication flow
