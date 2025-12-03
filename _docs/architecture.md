# Architecture Diagram
```mermaid
flowchart TD

    %% User Interaction Layer
    User[Developer User] --> UI[Web UI - React + Monaco Editor]

    %% Frontend
    UI -->|Select code block| ThreadMgr[Thread Manager (State Context)]
    ThreadMgr -->|Persist threads| API[Backend API - Node.js/FastAPI]

    %% Backend
    API --> DB[(AWS RDS - Postgres)]
    API --> AIService[AI Service Layer]

    %% AI Integration
    AIService -->|Prompt with context| OpenRouter[OpenRouter API]
    AIService -->|Prompt with context| OpenAI[OpenAI API]
    AIService -->|Prompt with context| AWSBedrock[AWS Bedrock Models]

    %% Responses
    OpenRouter --> AIService
    OpenAI --> AIService
    AWSBedrock --> AIService

    AIService --> API
    API --> ThreadMgr
    ThreadMgr --> UI
    UI --> User

    %% Hosting
    UI --> Amplify[AWS Amplify Hosting]
    API --> Amplify
---

### 🔑 Explanation of Components
- **User → Web UI (React + Monaco)**  
  Developers paste/write code, highlight blocks, and trigger AI feedback.

- **Thread Manager (Frontend State)**  
  Manages multiple inline threads tied to code ranges. Handles persistence and rendering.

- **Backend API (Node.js/FastAPI)**  
  Receives requests, stores threads in **AWS RDS (Postgres)**, and routes AI queries.

- **AI Service Layer**  
  Abstracts calls to different providers (OpenRouter, OpenAI, AWS Bedrock). Ensures consistent prompt formatting and context management.

- **Hosting**  
  Frontend + backend deployed via **AWS Amplify** for simplicity and scalability.

---

This diagram shows the **end‑to‑end flow**:  
Developer → UI → Thread Manager → Backend → AI Service → AI Provider → Response → Persisted in DB → Back to UI.