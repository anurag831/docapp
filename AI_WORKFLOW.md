# AI Workflow and Verification Approach

## AI Assistance Overview
This application was designed and constructed using an end-to-end agentic workflow powered by Google Antigravity and the Gemini 3.8 Flash model. The implementation adhered strictly to the engineering specification, database schema, component architecture, and git commit progression.

## Phased Development Lifecycle
1. **Environment Setup & Database Layer**:
   - Initialized Git repository and configured selective file tracking.
   - Configured SQLite with `better-sqlite3` (`./data.db`) featuring user seeds (Alice, Bob, Carol) and normalized document & sharing relational tables with cascading integrity.
2. **Server & REST API**:
   - Implemented Express.js backend with JSON body parsing, CORS support, static SPA serving in production, and centralized `x-user-id` session verification.
   - Implemented full CRUD endpoints, owner-restricted deletion, granular authorization (owner title rename vs. shared content editing), and multi-user document sharing.
   - Built file ingestion pipeline with Multer converting `.txt` and `.md` plain text directly into ProseMirror-compatible TipTap JSON nodes.
3. **Frontend Application**:
   - Created React 18 SPA powered by Vite with dev proxy targeting Express backend on port 3001.
   - Configured Axios client with automated `x-user-id` request interception from `localStorage`.
   - Developed `Login` page with quick demo user switching.
   - Implemented `TipTapEditor` with StarterKit and Underline extensions, utilizing `onMouseDown` preventDefault event handling to preserve editor focus during toolbar interactions.
   - Built `Dashboard` with dedicated "My Documents" and "Shared with Me" views, inline renaming, deletion, and file upload button.
   - Developed `Editor` with debounced 2-second automatic persistence, manual saving, title blur synchronization, and custom modal-based document sharing.
4. **Verification Strategy**:
   - **Automated Testing**: Created Jest + Supertest integration suite verifying document creation, retrieval, access control restrictions (404 for non-shared documents), and sharing workflow with database resets between test cases.
   - **End-to-End Browser Testing**: Validated real-world flows including Alice creating documents, applying rich text formatting, persistence across page reloads, sharing with Bob, Bob viewing shared documents, and `.txt` file uploads converting to editable rich text documents.
