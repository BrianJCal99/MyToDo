# Project Guidelines for Todo List App

---

## Project Overview

This is a Todo List mobile application built using:

- Expo (React Native)
- Redux Toolkit (state management)
- AsyncStorage (local persistence)
- Supabase (remote database & sync)

Target platforms: Android and iOS only.

The app is designed with an **offline-first architecture** and must maintain **clean, scalable, and maintainable code**.

---

## Core Principles

- Follow clean architecture and separation of concerns
- Keep logic modular and reusable
- Prefer simplicity over unnecessary complexity
- Use immutable state updates (Redux Toolkit best practices)
- Ensure the app works offline at all times
- Sync with backend when network is available

---

## Folder Structure

- `/features/todos` → Redux slice, actions, thunks
- `/store` → Redux store configuration
- `/services` → Supabase client and AsyncStorage helpers
- `/components` → Reusable UI components
- `/screens` → Screen-level components

---

## Data Model

Each todo must follow this structure:

- id: string (UUID)
- title: string (required)
- description: string (optional)
- completed: boolean
- createdAt: number (timestamp)
- updatedAt: number (timestamp)
- synced: boolean (tracks if synced with Supabase)

---

## State Management (Redux)

Use Redux Toolkit.

State shape:

- todos: Todo[]
- loading: boolean
- error: string | null
- filter: 'all' | 'completed' | 'active'

Use:

- createSlice for reducers
- createAsyncThunk for async logic

---

## Required Actions

Implement the following:

- addTodo
- updateTodo
- deleteTodo
- toggleTodo
- setFilter

Async thunks:

- fetchTodos (Supabase → store)
- syncTodos (local → Supabase)
- hydrateTodos (AsyncStorage → store)

---

## AsyncStorage Rules

- Persist todos locally after every change
- Load todos on app startup
- Never block UI while reading/writing
- Handle storage failures gracefully

---

## Supabase Rules

- Use Supabase as the remote database
- Table name: `todos`

Sync Strategy:

- App startup:
  - Load from AsyncStorage first
  - Then fetch from Supabase and merge

- Offline changes:
  - Mark todos as `synced: false`

- When online:
  - Push unsynced todos to Supabase

- Conflict resolution:
  - Use `updatedAt` → latest update wins

---

## Theme

The app uses a **bold yellow (`#FFD600`) and black (`#111111`)** color scheme on a **light background**.

This high-contrast pairing creates a powerful, energetic, and modern aesthetic — commanding attention and conveying sophisticated, modern style.

The app responds to the device's light/dark mode setting automatically.

Theming system:
- `constants/theme.ts` — defines `ThemeColors` interface, `lightColors`, and `darkColors`
- `hooks/use-theme-colors.ts` — `useThemeColors()` hook returns the active color set via `useColorScheme()`
- Every component calls `const colors = useThemeColors()` and passes colors into `makeStyles(colors)`

Color tokens (`ThemeColors` interface):

| Token | Light | Dark | Usage |
|---|---|---|---|
| `yellow` | `#FFD600` | `#FFD600` | Buttons, checkboxes, active states |
| `black` | `#111111` | `#111111` | Text on yellow (buttons, checkmarks) — always dark |
| `background` | `#F7F7F0` | `#111111` | Screen background |
| `surface` | `#FFFFFF` | `#1A1A1A` | Cards, inputs, sidebar |
| `border` | `#E0E0D5` | `#2C2C2C` | Borders and dividers |
| `text` | `#111111` | `#FFFFFF` | Primary readable text |
| `muted` | `#777777` | `#888888` | Secondary text |
| `placeholder` | `#AAAAAA` | `#555555` | Input placeholder |
| `disabled` | `#FFF5B0` | `#3A3200` | Disabled button background |
| `disabledText` | `#B8A000` | `#7A6A00` | Disabled button text |

Rules:
- **Always use the device theme-based approach when designing any UI** — every screen and component must respond to the device's light/dark mode setting
- Always call `useThemeColors()` — never import `lightColors`/`darkColors` directly in components
- Use `colors.text` for primary text, `colors.black` only for text rendered on top of yellow
- Never hardcode hex values in component files
- Never use static `StyleSheet.create({...})` with hardcoded colors — always use the `makeStyles(colors)` pattern

---

## UI Guidelines

- Use React Native components only
- Use FlatList for rendering todos
- Keep UI minimal and functional
- Avoid heavy styling libraries unless necessary

Required UI elements:

- Todo input field
- Todo list
- Toggle (complete/incomplete)
- Edit and delete actions
- Filter controls (All / Completed / Active)

---

## Behavior Rules

- Prevent adding empty todos
- New todos appear at the top
- Editing updates `updatedAt`
- Toggling completion does not affect other fields
- Deleting removes todo locally and remotely
- Filters must update instantly

---

## Error Handling

Always handle:

- Network failures
- Supabase errors
- AsyncStorage errors

Do not crash the app. Provide safe fallbacks.

---

## Code Standards

- Use functional components and React hooks
- Prefer TypeScript
- Use clear and descriptive naming
- Avoid duplicated logic
- Comment only when necessary (focus on why, not what)

---

## When Generating Code

- Do not include web-specific code
- Do not use browser APIs
- Ensure compatibility with Expo
- Keep files modular and focused
- Reuse logic where possible

---

## Expected Output

When implementing features:

- Provide complete, working code
- Follow the project structure
- Keep logic separated from UI
- Ensure all features integrate with Redux, AsyncStorage, and Supabase correctly

---

## Notes

This project prioritizes:

- Reliability (offline-first)
- Simplicity (clean code)
- Scalability (clear structure)

Avoid over-engineering solutions.
