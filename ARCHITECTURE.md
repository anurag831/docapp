# Architecture & Technical Design

## 1. System Topology & Overview

DocApp is architected as a **unified full-stack web application** combining an **Express.js** backend with a **React 18** single-page application built with **Vite**.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (React 18 / Vite)                 │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │   TipTap Editor      │  │    Presence Bar & Drawer    │  │
│  │  (ProseMirror AST)   │  │   (Version History & Comms) │  │
│  └──────────┬───────────┘  └──────────────┬──────────────┘  │
└─────────────┼─────────────────────────────┼─────────────────┘
              │ REST API                    │ WebSocket (/ws)
              ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express.js)                      │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │  Document & RBAC     │  │   In-Memory Room Manager    │  │
│  │  REST Routes         │  │   (Real-Time Presence)      │  │
│  └──────────┬───────────┘  └─────────────────────────────┘  │
│             ▼                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         SQLite Relational Database (better-sqlite3)   │  │
│  │   users • documents • shares • comments • versions    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **Development Mode**: The Vite development server runs on `http://localhost:5173` and proxies `/api` and `/ws` requests to the Express server on port `3001`.
- **Production Mode**: The Express server directly serves the pre-compiled Vite bundle from `client/dist`, providing a unified single-port service without cross-origin complexity, ready for single-container cloud deployment (e.g. Railway, Render, Docker).

---

## 2. Relational Database Schema (SQLite)

The application uses **SQLite** via `better-sqlite3` (`./data.db`), ensuring fast, zero-configuration embedded persistence with ACID guarantees and synchronous I/O performance.

### Schema Definitions

```sql
-- Users (seeded with Alice, Bob, Carol)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT NOT NULL DEFAULT '',
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Granular Role-Based Sharing
CREATE TABLE shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'editor', 'commenter', 'viewer'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, shared_with)
);

-- Anchored Comments & Suggestions
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_text TEXT,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- Immutable Revision Snapshots
CREATE TABLE document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Relational Integrity
- All foreign keys utilize `ON DELETE CASCADE`: deleting a document automatically cleans up its associated shares, comments, and version snapshots.
- A unique compound constraint on `shares(document_id, shared_with)` prevents duplicate permission records.

---

## 3. Editor Core & Structured AST State

DocApp implements the **TipTap** editor framework built on top of **ProseMirror**.

### Why Structured JSON AST Over Raw HTML or Markdown?
- **Injection Safety**: Content is saved as a structured ProseMirror JSON object rather than arbitrary HTML strings, neutralizing XSS vectors.
- **Deterministic Serialization**: The ProseMirror Abstract Syntax Tree (AST) preserves exact paragraph, heading, list, and formatting node structures across sessions.
- **Bi-directional Conversion**: Facilitates clean export transformations (e.g. converting AST blocks to Markdown) and clean file ingestion (parsing `.txt` or `.md` files into AST nodes).

### Save Lifecycle & Synchronization
1. **Debounced Auto-Save (2000ms)**: Keystrokes in TipTap update local React state and reset a 2-second debounce timer. When the timer expires, an automated save payload is sent to `PUT /api/documents/:id`.
2. **Manual Save Checkpoint**: Clicking the **Save** button clears active debounce timers and forces an immediate server commit with `isManualSave: true`, triggering a forced version snapshot.
3. **Typing Notification**: Keystrokes invoke `notifyTyping()` over WebSockets to broadcast live collaboration indicators to peer users.

---

## 4. Role-Based Access Control (RBAC)

Permissions are strictly calculated and enforced on the backend for every incoming request:

| Role | Edit Content | Rename Title | Share & Revoke | View Comments | Post Comments | View History | Restore Version | Delete Doc |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Editor** | Yes | No | No | Yes | Yes | Yes | Yes | No |
| **Commenter** | Read-Only | No | No | Yes | Yes | Yes | No | No |
| **Viewer** | Read-Only | No | No | Yes | No | Yes | No | No |

### Server-Side Route Guards
- `PUT /api/documents/:id`: Rejects updates from `viewer` (403) and `commenter` (403). Allows editors to update `content`, but ignores `title` changes unless the user is the `owner`.
- `POST /api/documents/:id/comments`: Rejects comment submissions from `viewer` roles (403).
- `POST /api/documents/:id/versions/:versionId/restore`: Rejects rollback requests from `viewer` and `commenter` roles (403).
- `DELETE /api/documents/:id`: Strictly restricted to document `owner` (403 for all other roles).

---

## 5. Real-Time Collaboration Layer (Tier 1 WebSockets)

Real-time awareness is implemented via **native WebSockets (`ws`)** attached directly to the Express HTTP server:

```
Client (Alice)                 WebSocket Server (/ws)               Client (Bob)
     │                                │                                   │
     ├── join (docId: 1) ────────────►│◄──────────── join (docId: 1) ─────┤
     │                                ├── presence_state ────────────────►│
     │◄── presence_state ─────────────┤                                   │
     │                                │                                   │
     ├── typing (isTyping: true) ────►├── typing (user: Alice) ──────────►│ (Avatar pulses)
     │                                │                                   │
     ├── doc_saved (v3) ─────────────►├── remote_save (user: Alice) ─────►│ (Update Banner)
```

- **Document Room Manager**: Manages rooms as `Map<docId, Map<userId, PresenceState>>`.
- **Heartbeat & Pruning**: Clients emit heartbeats every 15 seconds. Clients inactive for more than 45 seconds or disconnecting are automatically pruned, and an updated `presence_state` is broadcast to remaining collaborators.
- **Remote Save Notification**: When a collaborator saves changes, a WebSocket `doc_saved` event alerts active viewers with an **"Update View"** banner to refresh the editor seamlessly.

---

## 6. Document Version History Architecture

### Hybrid Snapshot Triggering & Throttling
To prevent database bloat while ensuring critical milestones are never lost:
- **Forced Snapshots**: Immediately generated on document creation (`"Initial document"`), file import (`"File import: ..."`), manual save (`"Manual save"`), and version restore (`"Restored from Version #X"`).
- **Throttled Autosaves**: Background debounced auto-saves check the timestamp of the last recorded snapshot. If less than 300 seconds (5 minutes) have elapsed, snapshot creation is skipped while content is preserved.

### Non-Destructive Restore Semantics
When an owner or editor restores a historical version:
1. The backend automatically creates a backup snapshot of the current active document state labeled `"Backup before restore"`.
2. The document title and content are rolled back to the selected snapshot.
3. A new version snapshot is created labeled `"Restored from Version #X"`.
4. WebSocket sync broadcasts update notices to all active collaborators.
**Zero data loss guarantee**: Current drafts are permanently backed up before any restore takes place.

### Isolated Version Preview Modal Architecture
Early iterations previewed historical snapshots in-place within the primary TipTap editor. This created race conditions where TipTap's `onUpdate` fired during editor re-enabling, contaminating active draft state.
- **Architectural Solution**: Decoupled the preview into a dedicated `VersionPreviewModal` dialog overlay.
- **State Integrity**: The primary TipTap editor strictly binds to the document's real active content (`content={content}`, `editable={isEditable}`). The preview modal renders an isolated read-only TipTap canvas (`editable={false}`, `showPreviewToolbar={true}`).
- **Visual Parity**: The preview modal replicates the authentic editor workspace layout (top title bar, metadata badges, disabled formatting toolbar, and content canvas) without touching or polluting the editor's React state, cursor position, or undo/redo history.

---

## 7. Export Engine (Markdown & PDF)

1. **Client-Side Markdown Export (`markdownExporter.js`)**:
   - Iterates through the ProseMirror JSON AST nodes (`heading`, `paragraph`, `bulletList`, `orderedList`, `blockquote`, `horizontalRule`, text marks like `bold`, `italic`, `underline`) and outputs standard Markdown syntax.
   - Generates a client-side Blob (`text/markdown`) and triggers an automatic browser download.
2. **High-Fidelity PDF Export (`@media print`)**:
   - Leverages browser print engines with print-specific CSS rules.
   - Suppresses UI chrome (headers, toolbars, buttons, modals, sidebars) and formats the document with 20mm printable margins, black typography, and break-avoidance rules for headings and quotes.

---

## 8. Theming Architecture (Dark Mode & Branding)

- **Theme Context (`ThemeContext.jsx`)**:
  - Detects system preference via `window.matchMedia('(prefers-color-scheme: dark)')` on first launch.
  - Persists user selection in `localStorage.setItem('docapp_theme', ...)`.
  - Dynamically sets the `data-theme="dark"` attribute on the `<html>` root element.
- **High-Contrast Design System**:
  - Light mode: Canvas `#f8f9fa`, Surface `#ffffff`, Text `#202124`, Border `#dadce0`.
  - Dark mode: Canvas `#121214`, Surface `#1e1f23` / `#27292d`, Text `#e8eaed`, Accents `#8ab4f8`.
  - Custom dark scrollbars (`scrollbar-color: #3c4043 #121214`) prevent default white browser scrollbars from breaking dark mode immersion.
  - Print styles strictly override dark mode, guaranteeing printed PDFs and hard copies remain clean paper-white.

---

## 9. Key Technical Trade-offs & Decisions

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Database** | SQLite (`better-sqlite3`) | PostgreSQL / MySQL | Zero external infrastructure required; single-file persistence; instant setup; fast synchronous operations for single-server setups. |
| **Collaboration** | WebSockets Presence + Save Broadcasts | Full CRDTs (Yjs / Automerge) | Lightweight, reliable collaboration awareness without the complexity, latency, and memory footprint of operational transformations. |
| **Document Format** | ProseMirror JSON AST | Raw HTML / Markdown | Schema-enforced formatting; AST facilitates direct Markdown export and structured inspection; immune to raw HTML injection. |
| **Version Preview** | Isolated Modal Dialog | In-Place Editor Preview | Guarantees zero pollution of active editor drafts and eliminates TipTap transaction/event collision bugs. |
| **Auth System** | Simulated Session (`x-user-id`) | JWT / OAuth2 | Kept scope focused on core collaborative editing, permissions, and versioning while maintaining clear separation for JWT middleware drop-in. |
