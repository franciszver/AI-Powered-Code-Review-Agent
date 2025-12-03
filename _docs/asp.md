# Agent Single Prompt (ASP.md)
## AI-Powered Code Review Assistant

---

### Objective
Build a **web-hosted AI-powered code review assistant** that provides intelligent, contextual, block-level code review feedback.  
The assistant must support inline comments tied to code selections, multi-file context, GitHub-style patch suggestions, persistent threads, and unit testing for reliability.  
This project is scoped for **production-grade reviews** for engineering teams, but MVP is single-user.

---

### Resources Available
- **AI Keys:** OpenAI, OpenRouter, AWS Bedrock (via local AWS profile).
- **AWS Profile:** Available locally for resource creation and allocation.
- **Hosting:** AWS Amplify for frontend + backend deployment.
- **Database:** AWS RDS (Postgres preferred for ease/debugging).
- **Frontend:** React + Monaco Editor (free, VS Code engine).
- **Backend:** Node.js/Express or Python FastAPI (choose whichever is fastest to implement).
- **State Management:** React Context + Reducer (or Redux Toolkit).
- **Testing Frameworks:**  
  - Frontend: Jest + React Testing Library.  
  - Backend: Jest (Node.js) or Pytest (FastAPI).  
- **Documentation:** PRD.md, ARCHITECTURE.md, APPROACH.md, RESOURCES.md.

---

### Development Process (Follow in Order)
1. **Core UI**
   - Initialize React frontend.
   - Integrate Monaco Editor with syntax highlighting.
   - Implement code input (paste/write).
   - Enable line/block selection.
   - **Unit Tests:** Verify editor renders, syntax highlighting works, and selection logic returns correct ranges.

2. **Inline Threads**
   - Create thread model: `{id, file, range, comments[]}`.
   - Implement inline comment UI tied to selections.
   - Support multiple threads per file.
   - Temporary local persistence.
   - **Unit Tests:** Validate thread creation/deletion, comments tied to correct ranges, multiple threads render correctly.

3. **Backend API & Persistence**
   - Initialize backend (Express/FastAPI).
   - Define REST endpoints for threads (create, retrieve, update).
   - Connect to AWS RDS (Postgres).
   - Store threads persistently.
   - **Unit Tests:** Test API endpoints (CRUD), mock DB interactions, validate error handling.

4. **AI Integration**
   - Abstract AI service layer (pluggable providers).
   - Integrate OpenRouter, OpenAI, AWS Bedrock.
   - Prompt template includes file type, surrounding context, selected block, and user query.
   - Return contextual feedback with explanations.
   - Render GitHub-style diff suggestions inline.
   - **Unit Tests:** Mock AI responses, validate prompt formatting, ensure provider switching works, test rendering of AI feedback.

5. **Hosting & Deployment**
   - Configure AWS Amplify for frontend hosting.
   - Deploy backend API (Amplify or AWS Lambda + API Gateway).
   - Connect frontend and backend endpoints.
   - Verify end-to-end workflow.
   - **Unit Tests:** Integration tests for frontend-backend communication, validate environment variable loading.

6. **Edge Case Handling**
   - Large file support (context slicing).
   - Nested selections (merge or warn).
   - Token management for long prompts.
   - Fallback persistence (local storage if DB unavailable).
   - **Unit Tests:** Test large file handling, nested selection warnings, fallback persistence logic.

7. **Documentation & Polish**
   - Update README.md with setup instructions, architecture notes, and trade-offs.
   - Document future team collaboration features in README.
   - Ensure PRD.md, ARCHITECTURE.md, APPROACH.md, RESOURCES.md are referenced.
   - **Unit Tests:** Linting/formatting checks, ensure test coverage ≥ 80%, CI/CD pipeline runs tests before deployment.

---

### Functional Requirements
- Syntax highlighting and language detection.
- Inline threads tied to code ranges.
- Persistent storage of threads in AWS RDS.
- AI feedback includes explanations + GitHub-style diff suggestions.
- Multi-file context supported in prompts.
- Hosted on AWS Amplify.
- Unit tests integrated across frontend, backend, persistence, and AI service layer.

---

### Acceptance Criteria
- ✅ Code editor supports syntax highlighting and selections.
- ✅ AI feedback tied to selected code blocks with explanations.
- ✅ Inline threads persist across sessions.
- ✅ Patch suggestions rendered in GitHub-style diff format.
- ✅ Multi-file context supported in prompts.
- ✅ Backend database stores and retrieves threads reliably.
- ✅ Unit tests exist for frontend, backend, persistence, and AI service layer.
- ✅ Minimum 80% test coverage achieved.
- ✅ CI/CD pipeline runs tests before deployment.
- ✅ Application deployed and accessible via AWS Amplify.

---

### Sequence Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant User as Developer
    participant UI as Frontend (React + Monaco)
    participant ThreadMgr as Thread Manager (State)
    participant API as Backend API (Express/FastAPI)
    participant DB as AWS RDS (Postgres)
    participant AI as AI Service Layer
    participant Provider as AI Providers (OpenAI/OpenRouter/AWS Bedrock)
    participant Tests as Unit Tests (Jest/Pytest)

    User->>UI: Paste/write code
    User->>UI: Highlight block + Ask AI
    UI->>ThreadMgr: Create new thread
    ThreadMgr->>API: Send thread + code context
    API->>DB: Persist thread
    API->>AI: Send prompt (context + selection + query)
    AI->>Provider: Request AI feedback
    Provider-->>AI: Return response
    AI-->>API: Format response (explanation + diff)
    API-->>ThreadMgr: Return AI feedback
    ThreadMgr-->>UI: Render inline thread with AI response
    UI-->>User: Display contextual feedback + patch suggestion
    Tests-->>UI: Validate UI components
    Tests-->>API: Validate endpoints
    Tests-->>AI: Validate prompt/response handling
    Tests-->>DB: Validate persistence logic
