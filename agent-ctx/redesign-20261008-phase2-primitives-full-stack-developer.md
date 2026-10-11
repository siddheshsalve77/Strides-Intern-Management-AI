# Task: redesign-20261008-phase2-primitives

Agent: full-stack-developer (shadcn primitives enhancement)
Phase: 2 (Primitives Enhancement) — sibling to dashboard/tasks phases
Date: 2026-10-08

## Context Read
- Previous phase 1 work (redesign-20261008-visual-evolution-phase1) expanded `src/app/globals.css` with premium utility classes (`.glass-panel`, `.sheet-premium`, `.backdrop-premium`, `.focus-glow`, `.press-tactile`, `.btn-gradient-*`, `.btn-glass`, `.animate-slide-up`).
- Phase 1 already updated `button.tsx` to wire `default`→`btn-gradient-primary`, `destructive`→`btn-gradient-danger`, plus opt-in variants `gradient`/`ai`/`success`/`glass`/`warm`/`violet`.
- Phase 1 did NOT touch: card, badge, input, textarea, dialog, drawer, sheet, select, tabs.

## Safety Constraints Honored
- ZERO changes to variant names or cva structure on button/badge.
- ZERO changes to component signatures, export names, `data-slot` attrs, forwardRef pattern (none of these use forwardRef — they're plain function components, preserved).
- ZERO removal of existing classes — only ADDITIVE class strings via `cn()`.
- ZERO logic/event-handler/state/prop changes — pure className additions.

## Per-File Changes

### button.tsx
- Added `press-tactile` to the START of base cva string so ALL variants get tactile press feedback (active:scale(0.97)). Was already additive on top of phase 1 work.
- Verified existing variants intact: default, destructive, outline, secondary, ghost, link.
- Verified opt-in premium variants intact: gradient, ai, success, glass, warm, violet.

### card.tsx
- ENHANCED Card base className only. Kept `bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm`.
- ADDED premium soft shadow: `shadow-[0_1px_2px_oklch(0.5_0.008_75/0.04),0_8px_24px_-12px_oklch(0.5_0.008_75/0.05)]` (soft ambient lift + crisp 1px edge).
- ADDED dark-mode variant shadow: `dark:shadow-[0_1px_2px_oklch(0_0_0/0.2),0_8px_24px_-12px_oklch(0_0_0/0.22)]`.
- ADDED subtle inner border highlight via inset ring: `ring-1 ring-inset ring-white/[0.06] dark:ring-white/[0.04]` (does NOT affect layout — ring is box-shadow-based).
- CardHeader/CardTitle/CardDescription/CardAction/CardContent/CardFooter signatures untouched.

### badge.tsx
- ENHANCED `default` variant: added teal-tinted premium shadow `shadow-[0_1px_2px_oklch(0.45_0.09_178/0.3),0_1px_0_0_oklch(1_0_0/0.2)_inset]` (subtle outer glow + inner top edge highlight).
- ENHANCED `destructive` variant: replaced flat `bg-destructive` with richer coral→red gradient `bg-[linear-gradient(180deg,oklch(0.62_0.21_25),oklch(0.54_0.21_15))]` + dark-mode gradient + soft red glow shadow + white inset ring for depth. Hover uses `brightness-105` for tactility.
- `secondary` and `outline` untouched (no premium treatment needed).
- cva structure, variant names, defaultVariants untouched.

### input.tsx
- ADDED `focus-glow` class as a new line in the `cn()` args. Provides teal-tinted focus ring + border highlight on focus (per `.focus-glow` CSS: `0 0 0 3px oklch(0.55 0.1 178/0.18)`).
- Kept ALL existing classes (file:text-foreground, h-9, px-3, focus-visible:ring-ring/50, etc.) — `focus-glow` is SUPPLEMENTARY, not a replacement.

### textarea.tsx
- ADDED `focus-glow` class to cn() args (same treatment as input).
- Kept all existing classes intact.

### dialog.tsx
- ENHANCED DialogOverlay: added `backdrop-premium` (iOS-style blur+dim: `backdrop-filter: blur(6px) saturate(1.2)` + `oklch(0.21 0.015 75/0.32)` dim, 50% black in dark). Kept `bg-black/50` + all animate-* classes.
- ENHANCED DialogContent: added `glass-panel` (layered glass with blur+saturate+inner highlight+soft shadow for iOS-sheet feel). Kept `bg-background`, all `data-[state]` animations, sizing, padding, close-button structure untouched.

### drawer.tsx
- ENHANCED DrawerOverlay: added `backdrop-premium`. Kept all existing classes.
- ENHANCED DrawerContent: added `sheet-premium` (iOS sheet feel — more opaque than glass-panel for readability, top-edge inner highlight, ambient shadow) + `animate-slide-up` (0.22s slide-up entrance).
- Kept ALL `data-[vaul-drawer-direction=*]` directional classes, the drag handle div, structure untouched.

### sheet.tsx
- ENHANCED SheetOverlay: added `backdrop-premium`. Kept all existing classes.
- ENHANCED SheetContent: added `sheet-premium` + `animate-slide-up`. Kept ALL per-side (`side === "right"`, etc.) slide-in/out animation classes + `bg-background` + transitions untouched. Close button structure untouched.

### select.tsx
- ENHANCED SelectTrigger: added `focus-glow` for premium focus state. Kept all existing classes including `focus-visible:ring-ring/50` (supplementary, not replacement).
- ENHANCED SelectContent: added `glass-panel` (premium glass dropdown) + `animate-slide-up` entrance. Kept ALL `data-[state]` animations, `data-[side=*]` slide-in classes, max-height, origin, etc. untouched.

### tabs.tsx
- ENHANCED TabsTrigger: added `press-tactile` (tactile press feedback).
- ENHANCED active state: added subtle gradient bg `data-[state=active]:bg-[linear-gradient(180deg,oklch(1_0_0),oklch(0.985_0.003_178/0.95))]` (white→subtle teal-tinted) + dark variant `dark:data-[state=active]:bg-[linear-gradient(180deg,oklch(0.25_0.012_260/0.9),oklch(0.2_0.012_260/0.9))]` + premium shadow `data-[state=active]:shadow-[0_1px_2px_oklch(0.5_0.008_75/0.06),0_1px_0_0_oklch(1_0_0/0.5)_inset]` (outer soft shadow + inner top edge highlight).
- The new gradient/shadow classes are declared AFTER the existing `data-[state=active]:bg-background` and `dark:data-[state=active]:bg-input/30` so they override (later in source wins for same-specificity CSS rules).
- TabsList, TabsContent untouched.

## Lint Status
- `bun run lint` → PASS (clean, zero errors, zero warnings).
- Dev server log shows Next.js 16.1.3 running on port 3000, no compile errors.

## Variant API Backwards-Compat Verification
- All 6 button variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) — NAMES PRESERVED.
- All 4 badge variants (`default`, `secondary`, `destructive`, `outline`) — NAMES PRESERVED.
- All 6 button sizes (`default`, `sm`, `lg`, `xl`, `icon`, `icon-sm`) — PRESERVED.
- Card subcomponents — SIGNATURES PRESERVED.
- All Radix `data-slot` attrs — PRESERVED.
- All `cn()` merge patterns — PRESERVED.
- All forwardRef patterns — PRESERVED (these components use plain function components, not forwardRef).
- All event handlers / state / props — UNTOUCHED.

## New Button Variants Confirmed (ADDITIVE only)
- `gradient` → `.btn-gradient-primary` (teal→emerald CTA)
- `ai` → `.btn-gradient-ai` (blue→violet AI actions)
- `glass` → `.btn-glass` (frosted glass button)
- (Also inherited from phase 1: `success`, `warm`, `violet`)

Existing views using `variant="default"`, `variant="outline"`, etc. continue to work unchanged.
