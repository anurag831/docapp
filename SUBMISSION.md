# DocApp — Project Submission

## Project Deliverables

- **Full Source Code**: Complete Express backend + React 18 frontend repository.
- **`README.md`**: Comprehensive local setup, running instructions, demo credentials, and script references.
- **`ARCHITECTURE.md`**: Technical architecture, data models, WebSocket design, RBAC gates, and trade-off analysis.
- **`AI_WORKFLOW.md`**: Detailed AI collaboration methodology, phased engineering lifecycle, debugging patterns, and quality assurance report.
- **`tests/documents.test.js`**: Automated integration test suite (11/11 tests passing).
- **Live Deployment URL**: `https://docapp-production-cba0.up.railway.app/`
- **Video Walkthrough URL**: `https://youtu.be/P_z_ix0IZn0`

---

## Feature Matrix & Implementation Status

| Feature Area | Capabilities Delivered | Status |
| :--- | :--- | :---: |
| **Rich Text Editor** | TipTap (ProseMirror AST), toolbar formatting (Bold, Italic, Underline, H1-H3, Lists, Blockquotes, Rules), focus preservation on toolbar click. | ✅ Complete |
| **Persistence & Auto-Save** | 2-second debounced background auto-save + forced manual save button with status indicators. | ✅ Complete |
| **File Ingestion** | Upload `.txt` and `.md` files; parses text into structured ProseMirror document AST nodes. | ✅ Complete |
| **Granular Permissions (RBAC)** | Strict server-side enforcement of 4 roles: `owner`, `editor`, `commenter`, and `viewer`. | ✅ Complete |
| **Sharing & Revocation UI** | Modal to share by email, modify existing collaborator roles, and revoke access with instant sync. | ✅ Complete |
| **Anchored Commenting** | Text highlight reference anchoring, threaded discussion sidebar, `Open` / `Resolved` filters, resolution workflows. | ✅ Complete |
| **Export Engine** | Client-side AST-to-Markdown serialization download and high-fidelity print-optimized PDF stylesheet. | ✅ Complete |
| **Real-Time Collaboration** | Native WebSockets (`ws`) presence bar, collaborator avatar stack, typing indicators, and remote save broadcast alerts. | ✅ Complete |
| **Document Version History** | Immutable revision snapshots, intelligent 5-min autosave throttling, chronological version drawer with live auto-refresh. | ✅ Complete |
| **Non-Destructive Restore** | Automatically creates a backup snapshot of current active drafts before restoring historical versions. | ✅ Complete |
| **Version Preview Modal** | Dedicated editor-styled preview modal with read-only toolbar and metadata, keeping active editor drafts 100% untouched. | ✅ Complete |
| **Theming & Polish** | Custom SVG document favicon, persistent light/dark mode toggles, WCAG-compliant dark theme, custom slim scrollbars. | ✅ Complete |

---

## Verification & Test Results

### Automated Integration Tests
- Framework: **Jest** + **Supertest** (`tests/documents.test.js`).
- Results: **11 passed, 11 total** (100% pass rate).
- Test execution command:
  ```bash
  npm test
  ```

### Production Bundle Verification
- Production build compiled using Vite:
  ```bash
  cd client && npm run build
  ```
  - **208 modules transformed**
  - **0 compilation errors**

---

## Quick Start & Evaluation Credentials

```bash
# 1. Install root dependencies
npm install

# 2. Install client dependencies
cd client && npm install && cd ..

# 3. Start development servers
npm run dev
```

Visit `http://localhost:5173`. Pre-seeded test accounts accessible via one-click login switcher:
- **Alice** (`alice@demo.com`) — Document Owner
- **Bob** (`bob@demo.com`) — Editor / Collaborator
- **Carol** (`carol@demo.com`) — Commenter / Viewer
