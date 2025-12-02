# Approach Document
## AI-Powered Code Review Assistant

This document outlines the step-by-step development process for building the AI-Powered Code Review Assistant.  
It serves as a roadmap so that any contributor or agent can determine the current stage of progress toward fulfilling the PRD.

---

## Phase 1: Core UI Setup
- [x] Initialize frontend project (React).
- [x] Integrate Monaco Editor (or CodeMirror if preferred).
- [x] Enable syntax highlighting for multiple languages.
- [x] Implement basic code input (paste/write).
- [x] Add line/block selection functionality.
- [x] **Unit Tests:**  
  - Verify editor renders correctly.  
  - Ensure syntax highlighting works for multiple languages.  
  - Confirm selection logic returns correct line ranges.

---

## Phase 2: Inline Thread System
- [x] Create thread data model (`id, file, range, comments[]`).
- [x] Implement inline comment UI tied to code selections.
- [x] Support multiple independent threads in a single file.
- [x] Add persistence layer (temporary local state).
- [x] **Unit Tests:**  
  - Validate thread creation and deletion.  
  - Ensure comments are tied to correct code ranges.  
  - Test rendering of multiple threads without overlap.

---

## Phase 3: Backend API & Persistence
- [x] Initialize backend (Node.js/Express or Python FastAPI).
- [x] Define REST endpoints for thread creation, retrieval, and updates.
- [x] Connect backend to AWS RDS (Postgres).
- [x] Store threads persistently in database.
- [x] **Unit Tests:**  
  - Test API endpoints (CRUD operations).  
  - Mock DB interactions to validate persistence logic.  
  - Ensure error handling for invalid requests.

---

## Phase 4: AI Integration
- [x] Abstract AI service layer for pluggable providers.
- [x] Integrate with OpenRouter, OpenAI, and AWS Bedrock APIs.
- [x] Build prompt template including:
  - File type
  - Surrounding context (multi-file support)
  - Selected block
  - User query
- [x] Return contextual feedback with explanations.
- [x] Render GitHub-style diff suggestions inline.
- [x] **Unit Tests:**  
  - Mock AI responses to validate prompt formatting.  
  - Ensure AI service layer handles multiple providers.  
  - Test rendering of AI feedback (explanation + diff).

---

## Phase 5: Hosting & Deployment
- [x] Configure AWS Amplify for frontend hosting.
- [x] Deploy backend API (Amplify or AWS Lambda + API Gateway).
- [x] Connect frontend and backend endpoints.
- [ ] Verify end-to-end workflow in hosted environment.
- [x] **Unit Tests:**  
  - Integration tests for frontend-backend communication.  
  - Validate deployment scripts (mocked).  
  - Ensure environment variables (API keys, DB config) load correctly.

---

## Phase 6: Edge Case Handling
- [x] Large file support (context slicing).
- [x] Nested selections (merge or warn).
- [x] Token management for long prompts.
- [x] Fallback persistence (local storage if DB unavailable).
- [x] **Unit Tests:**  
  - Test large file handling (mocked context slicing).  
  - Validate nested selection warnings.  
  - Ensure fallback persistence works when DB unavailable.

---

## Phase 7: Documentation & Polish
- [ ] Write `README.md` with setup instructions, architecture notes, and trade-offs.
- [ ] Document future team collaboration features in README.
- [x] Add `PRD.md`, `RESOURCES.md`, `ARCHITECTURE.md`, and `ASP.md` references.
- [x] Ensure codebase is clean, commented, and structured.
- [x] **Unit Tests:**  
  - Linting and formatting checks.  
  - Validate documentation build (if automated).  
  - Ensure test coverage ≥ 80%.

---

## Phase 8: Future Extensions (Beyond MVP)
- [ ] Multi-user collaboration (shared threads, dashboards).
- [ ] Team-level analytics (review hotspots, acceptance rates).
- [ ] Export feedback summaries (Markdown/JSON).
- [ ] Integration with Git hosting platforms (GitHub/GitLab).
- [ ] Advanced security/compliance features.

---

## Progress Tracking
Each phase contains checkboxes. Contributors should mark completed tasks to indicate progress.  
This ensures any agent or developer can quickly determine **where the project is in the journey** toward finishing the PRD.

---

## Unit Testing Summary
- **Frontend:** Jest + React Testing Library.  
- **Backend:** Jest (Node.js) or Pytest (FastAPI).  
- **Coverage Goal:** ≥ 80% for core logic.  
- **Mocking:** AI API calls and DB interactions mocked for deterministic results.  
- **CI/CD:** Tests run automatically in AWS Amplify build pipeline before deployment.
