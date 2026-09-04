# DocApp — Collaborative Rich-Text Document Platform

DocApp is a modern, responsive collaborative rich-text document platform inspired by Google Docs. It features real-time presence indicators, granular role-based sharing permissions, anchored comments, document version history with non-destructive restore, file ingestion, PDF/Markdown export, and a high-contrast dark mode.

- **Live Application**: [https://docapp-production-cba0.up.railway.app/](https://docapp-production-cba0.up.railway.app/)
- **Video Walkthrough Demo**: [https://youtu.be/P_z_ix0IZn0](https://youtu.be/P_z_ix0IZn0)

---

## Features

### 1. Rich Text Editing
- Powered by **TipTap** and **ProseMirror AST**.
- Formatting toolbar: **Bold**, *Italic*, <u>Underline</u>, Headings (H1, H2, H3), Bullet Lists, Numbered Lists, Blockquotes, and Horizontal Rules.
- Preserves editor selection and focus during toolbar interactions via `preventDefault` handling.
- **Auto-Save Engine**: 2-second debounced auto-saving with manual save button for immediate checkpoint creation.

### 2. File Ingestion (.txt, .md)
- Direct file uploads from the dashboard.
- Converts `.txt` and `.md` plain text directly into structured ProseMirror document AST nodes ready for rich-text editing.

### 3. Role-Based Permissions & Sharing
- Granular permission levels:
  - **Owner**: Full administrative control, document renaming, share management, role modification, access revocation, version rollback, and deletion.
  - **Editor**: Full body content editing, version timeline inspection, and historical version restoration.
  - **Commenter**: Document body is read-only; anchored commenting and suggestion workflows enabled; version history read-only.
  - **Viewer**: Completely read-only viewing mode; editing, commenting, and version restoration restricted.
- **Share Modal**: Owners can share via email, switch user roles on the fly, and revoke access with immediate database synchronization.

### 4. Anchored Commenting & Suggestion Mode
- Highlight text within the editor to anchor feedback directly to document excerpts.
- Collapsible **Comments Sidebar** with `Open`, `Resolved`, and `All` filter tabs.
- Resolve and re-open workflows with author attribution and timestamps.

### 5. Document Version History & Non-Destructive Restore
- Chronological revision drawer (`🕒 History`) with live auto-refresh (`refreshTrigger`) when saves occur.
- **Smart Snapshot Throttling**: Forced snapshots on document creation, file imports, manual saves, and restores; 5-minute cooldown on background autosaves to prevent database bloat.
- **Non-Destructive Restore**: Automatically creates a backup snapshot of current active drafts before restoring past versions.
- **Isolated Version Preview Modal**: Displays historical snapshots in an authentic editor workspace layout (with read-only toolbar, metadata bar, and document sheet) while keeping active editor drafts 100% untouched.

### 6. Real-Time Collaboration Indicators (Tier 1 WebSockets)
- Attached native WebSocket server (`ws`) mounted on `/ws`.
- **Presence Bar**: Header avatar stack showing active collaborators with role-colored borders.
- **Typing Indicators**: Live pulsing indicator dots and typing notification toasts (`✍️ [User] is typing...`).
- **Remote Save Alerts**: Broadcast notification with an **"Update View"** action when another collaborator saves a new revision.

### 7. Document Export Engine
- **Markdown Export**: Direct client-side serialization of ProseMirror AST nodes to clean `.md` files.
- **PDF Export**: Print-optimized stylesheets (`@media print`) rendering clean margins, page-break rules, and printable typography ready for native "Save as PDF".

### 8. Modern Design & Dark Mode
- Custom SVG document favicon with blue gradient accents and folded-corner design.
- Full-stack dark mode respecting system preferences (`prefers-color-scheme`) with persistent toggle across Dashboard, Editor, and Login screens.
- Tailored WCAG-compliant color palette with custom slim dark scrollbars.

---

## Tech Stack

- **Frontend**: React 18, Vite, TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`), React Router v6, Axios, Vanilla CSS.
- **Backend**: Node.js, Express.js, native WebSockets (`ws`), Multer.
- **Database**: SQLite (`better-sqlite3`).
- **Testing**: Jest, Supertest.

---

## Local Setup & Installation

### Prerequisites
- Node.js v18+ and npm installed.

### Step 1: Clone and Install Root Dependencies
```bash
git clone <repo-url>
cd docapp
npm install
```

### Step 2: Install Client Dependencies
```bash
cd client
npm install
cd ..
```

### Step 3: Run in Development Mode
```bash
npm run dev
```
This concurrently starts:
- **Express Backend & WebSocket Server**: `http://localhost:3001`
- **Vite React Frontend**: `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Demo Accounts

The database comes pre-seeded with 3 demo users for easy multi-user testing:

| User | Email | Role / Context |
| :--- | :--- | :--- |
| **Alice** | `alice@demo.com` | Primary document owner & creator |
| **Bob** | `bob@demo.com` | Collaborator (Editor / Commenter) |
| **Carol** | `carol@demo.com` | Collaborator (Viewer / Reviewer) |

Use the quick user switcher on the `/login` screen to switch accounts instantly across different browser tabs to test real-time collaboration.

---

## NPM Scripts Reference

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `concurrently ...` | Runs both backend (3001) and Vite dev server (5173) |
| `npm run dev:server` | `node server/index.js` | Runs Express server only |
| `npm run dev:client` | `cd client && npm run dev` | Runs Vite frontend dev server only |
| `npm test` | `jest --testEnvironment=node` | Runs 11 automated integration tests |
| `npm run build` | `cd client && npm run build` | Compiles Vite production bundle into `client/dist` |
| `npm start` | `NODE_ENV=production node server/index.js` | Runs unified production server (port 3001) |

---

## Automated Test Suite

Run the full integration test suite with:
```bash
npm test
```

### Test Coverage (`tests/documents.test.js`):
- `POST /api/documents`: Document creation & initial version snapshot (v1).
- `GET /api/documents/:id`: Document retrieval with permission validation.
- `GET /api/documents/:id`: 404 access denial for non-shared documents.
- `POST /api/documents/:id/share`: Multi-user sharing with role enforcement.
- Role management: Role updates and owner access revocation.
- Commenting: Anchored comment creation for commenters vs viewer restrictions.
- Version History: Manual save checkpoint recording and version creation.
- Non-destructive restore: Automatic draft backup and historical rollback.
- Viewer restrictions: Read-only access to version history without restore permissions.

---

## Production Deployment

DocApp is configured for single-service container deployment:
```bash
# 1. Build client SPA
npm run build

# 2. Start unified production server
npm start
```
The Express server serves the compiled static SPA from `client/dist` and handles both `/api` endpoints and `/ws` WebSocket connections on a single port.
