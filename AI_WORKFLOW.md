# AI Workflow and Verification Approach

## AI Assistance Overview

DocApp was designed, engineered, and verified using an agentic pair-programming workflow powered by **Google Antigravity** and the **Gemini 3.8 Flash** model. The AI agent operated with full filesystem, shell, and contextual awareness, iteratively implementing features, diagnosing edge cases, creating automated test suites, and refining user interface polish.

---

## Phased Engineering Lifecycle

The project progressed across 7 structured development phases:

### Phase 1: Core Document Platform & Relational Data Layer
- Configured local relational persistence with SQLite (`better-sqlite3`) utilizing normalized relational tables for users, documents, and shares with cascading deletion rules.
- Implemented Express.js REST API with central session header verification (`x-user-id`), CRUD endpoints, and file upload processing via Multer.
- Built file ingestion converter translating raw `.txt` and `.md` files directly into ProseMirror TipTap document AST nodes.
- Initialized React 18 SPA powered by Vite with dev proxy to port 3001, global styling, and simulated multi-user switcher (Alice, Bob, Carol).
- Implemented TipTap rich text editor with toolbar formatting actions (Bold, Italic, Underline, Headings H1-H3, Lists, Blockquotes, Rules) utilizing `onMouseDown` `preventDefault` handlers to preserve selection and focus.

### Phase 2: Role-Based Access Control & Sharing Permissions
- Expanded sharing model into granular roles: `owner`, `editor`, `commenter`, and `viewer`.
- Implemented server-side permission gates:
  - `owner`: Full control (title renaming, content editing, sharing management, access revocation, version restore, deletion).
  - `editor`: Body content editing and version restoration; forbidden from renaming title or deleting document.
  - `commenter`: Content editing disabled (read-only); suggestions and commenting enabled; version history read-only.
  - `viewer`: Strictly read-only access; edits, comments, and version restores restricted.
- Created `ShareModal` allowing owners to grant roles, modify existing permissions, and revoke shared access with immediate synchronization.

### Phase 3: Anchored Commenting & Suggestion Mode
- Developed anchored feedback mechanism: users highlight text in the TipTap editor to create comments tied to specific document excerpts.
- Built collapsible `CommentsSidebar` supporting threaded discussions, author avatars, timestamp tracking, and `Open` / `Resolved` filter states.
- Implemented resolution workflows (mark resolved, re-open comment) with instant database updates.

### Phase 4: Document Export Engine (PDF & Markdown)
- Developed client-side `markdownExporter.js` translating ProseMirror JSON AST to clean GitHub Flavored Markdown syntax with immediate client download.
- Designed print-optimized stylesheets (`@media print`) that hide web navigation, toolbars, and modals while rendering clean typography, printable margins, and dedicated print headers for native "Save as PDF" exports.

### Phase 5: Real-Time Presence & Collaboration Indicators (Tier 1)
- Integrated native WebSockets (`ws`) on the Express HTTP server mounted at `/ws`, with Vite dev server proxying WebSocket connections.
- Implemented in-memory document room manager tracking active users, connection heartbeats, and typing states.
- Created `PresenceBar` displaying avatar stack of active collaborators with role-colored borders, pulsing typing dots, and live typing notifications (`✍️ [User] is typing...`).
- Added remote save notifications: active collaborators receive a broadcast banner when another user saves a revision, with an **Update View** action to refresh content seamlessly.

### Phase 6: Document Version History & Non-Destructive Restore
- Created `document_versions` table storing immutable revision snapshots (`id`, `document_id`, `title`, `content`, `created_by`, `version_number`, `label`, `created_at`).
- Implemented dual-mode snapshot triggering:
  - **Forced Snapshots**: Document creation (`"Initial document"`), file imports (`"File import: ..."`), manual save clicks (`"Manual save"`), and restore operations (`"Restored from Version #X"`).
  - **Throttled Autosaves**: 5-minute cooldown between automated background snapshots to prevent database bloat.
- Designed **Non-Destructive Restore**: creating a restore snapshot automatically backs up the active document draft before rolling back content, ensuring nothing is ever permanently lost.
- Created `VersionHistoryDrawer` with live auto-refresh (`refreshTrigger`) updating the revision list immediately upon saving without needing drawer close/reopen cycles.
- Built **VersionPreviewModal**: an isolated modal dialog replicating the real editor workspace with a read-only toolbar, document canvas, and metadata, completely decoupling preview rendering from the main editor state to eliminate race conditions.

### Phase 7: Modern Design, Dark Mode & Custom Branding
- Created custom SVG favicon with a Google Docs-inspired blue gradient and folded document corner.
- Implemented `ThemeContext` supporting system preference detection (`prefers-color-scheme`) and `localStorage` persistence.
- Added theme toggle switches across Dashboard, Editor, and Login screens.
- Authored dark theme CSS (`[data-theme="dark"]`) with tailored high-contrast palettes, elevated surface cards, dark TipTap editor sheets, custom scrollbars, and preserved print rules.

---

## AI Prompting & Debugging Patterns

### 1. Collaborative Root Cause Diagnosis
When subtle bugs surfaced during testing, the agent traced execution paths across frontend and backend:
- **Empty Version Preview Bug**: Identified that TipTap's `parseInitialContent` returned empty objects that didn't trigger `editor.commands.setContent('')`. Fixed by introducing an `isContentEmpty` AST validator.
- **Version List Refresh Bug**: Identified that the version drawer only fetched data on initial mount. Fixed by wiring a `versionRefreshKey` state trigger from save events to the drawer's `useEffect`.
- **Exit Preview State Restoration Bug**: Diagnosed that swapping content in-place within the active editor caused TipTap's `onUpdate` to fire and overwrite unsaved user drafts. Resolved with user consultation by isolating the preview into a dedicated `VersionPreviewModal`.

### 2. UI Alignment from Visual Feedback
When the user provided screenshots of the dark mode editor and modal preview, the agent analyzed visual discrepancies (redundant titles, missing toolbars, awkward nesting) and overhauled `VersionPreviewModal` to mirror the authentic editor workspace with a read-only toolbar, top header bar, and clean document canvas.

---

## Verification & Quality Assurance Strategy

### Automated Integration Testing
- Test suite implemented with **Jest** and **Supertest** in `tests/documents.test.js`.
- **11 out of 11 tests passing**:
  - `POST /api/documents`: Document creation with initial version snapshot (v1).
  - `GET /api/documents/:id`: Document retrieval for owners and shared collaborators.
  - `GET /api/documents/:id`: Access denial (404) for unauthorized users.
  - `POST /api/documents/:id/share`: Sharing with specific roles (`editor`, `commenter`, `viewer`).
  - Owner share revocation.
  - Commenter anchored feedback creation vs viewer commenting restriction.
  - Manual save snapshot creation with forced checkpoint labels.
  - Non-destructive version restoration and rollback.
  - Viewer role restrictions preventing version restore.

### Build & Bundle Verification
- Validated production client build via Vite (`npm run build` in `client/`):
  - 208 modules transformed and bundled with 0 errors.

### Manual Real-World Flow Validation
- Validated multi-tab real-time presence indicators and typing broadcasts across different users.
- Validated text selection, comment anchoring, and comment resolution.
- Validated version browsing, preview modal inspection, and restore operations.
- Validated Dark Mode toggling and persistence across page refreshes.
- Validated PDF print preview and Markdown file downloads.
