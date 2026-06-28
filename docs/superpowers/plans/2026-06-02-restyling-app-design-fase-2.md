# Restyling App Design Fase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the professional polish of SCHEDINONE front end with a conservative, UI-only pass.

**Architecture:** Add shared CSS utilities for professional panels/actions/status surfaces, then apply them to Admin and already-touched player surfaces without changing handlers or data contracts. Keep every functional branch, Firebase call, and route intact.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utility classes, Firebase Hosting.

---

### Task 1: Shared UI Utilities

**Files:**
- Modify: `src/index.css`

- [ ] Add reusable classes for secondary actions, admin tiles, status panels, modal panels, and compact KPI cards.
- [ ] Preserve existing class names used by tests.
- [ ] Run `npm run lint` after edits.

### Task 2: Admin Dashboard Visual Pass

**Files:**
- Modify: `src/pages/admin/AdminPage.tsx`

- [ ] Replace old glass-only sections with the new shared surface classes.
- [ ] Replace corrupted emoji labels with ASCII-safe text badges.
- [ ] Keep all existing click handlers, Firebase writes, route links, state variables and safety checks unchanged.
- [ ] Verify action links still point to the same admin routes.

### Task 3: Player Flow Polish

**Files:**
- Modify: `src/pages/SchedinaPage.tsx`
- Modify: `src/components/EmptyState.tsx`

- [ ] Use shared modal/panel/action classes where the old style remains.
- [ ] Clean visible corrupted strings in touched sections.
- [ ] Keep save, autosave, submit, export PDF and confirmation behavior unchanged.

### Task 4: Verification and Deploy

**Commands:**
- [ ] `npm test -- --run`
- [ ] `npm run lint`
- [ ] `npm run test:rules`
- [ ] `npm run build`
- [ ] Browser check on local or public app.
- [ ] `npx firebase deploy --project schedinone-2026 --only hosting`
