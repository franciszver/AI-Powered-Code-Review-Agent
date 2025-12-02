# Resources for AI-Powered Code Review Assistant

This document outlines the key resources, frameworks, and services used in the project, along with the rationale for each choice.

---

## Frontend

### React
- **Reason:** Mature ecosystem, component-based architecture, and strong developer adoption.
- **Benefit:** Easy integration with modern tooling, reusable components, and rapid prototyping.

### Monaco Editor
- **Reason:** Same editor engine used in VS Code, supports syntax highlighting and multi-language editing.
- **Benefit:** Rich developer experience, free to use, and strong support for code selection and inline annotations.

---

## Backend

### Node.js + Express (or Python FastAPI)
- **Reason:** Lightweight, flexible, and widely supported for building APIs.
- **Benefit:** Easy to integrate with AI APIs, supports rapid iteration, and can scale as needed.

### AWS RDS (Postgres)
- **Reason:** Structured relational database with strong support for queries and persistence.
- **Benefit:** Reliable thread storage, easy debugging, and familiar SQL interface for engineers.

---

## Hosting

### AWS Amplify
- **Reason:** Simplifies deployment of full-stack web applications.
- **Benefit:** Handles CI/CD, hosting, and scaling with minimal setup. Ideal for rapid MVP deployment.

---

## AI Integration

### OpenRouter API
- **Reason:** Provides access to multiple LLM providers through a single interface.
- **Benefit:** Flexibility to switch models without changing core integration.

### OpenAI API
- **Reason:** Industry-standard LLM provider with strong performance and developer tooling.
- **Benefit:** Reliable contextual feedback, patch suggestions, and explanations.

### AWS Bedrock
- **Reason:** Native AWS service for accessing multiple foundation models.
- **Benefit:** Seamless integration with AWS stack, useful for scaling and enterprise adoption.

---

## State Management

### React Context + Reducer (or Redux Toolkit)
- **Reason:** Needed to manage multiple independent threads tied to code ranges.
- **Benefit:** Predictable state management, easy debugging, and scalable for future collaboration features.

---

## Development & Tooling

### GitHub
- **Reason:** Familiar workflow for engineers, supports PRs and inline comments.
- **Benefit:** Easy to align UI/UX with GitHub-style review experience.

### Markdown Documentation
- **Reason:** Lightweight, readable, and developer-friendly.
- **Benefit:** Clear communication of requirements, architecture, and trade-offs.

---

## Summary

- **Frontend:** React + Monaco Editor → Developer-focused UI with inline code selection.  
- **Backend:** Node.js/Express + AWS RDS → Reliable API and persistence.  
- **Hosting:** AWS Amplify → Simple deployment and scaling.  
- **AI:** OpenRouter, OpenAI, AWS Bedrock → Flexible, contextual, production-grade feedback.  
- **State Management:** React Context/Reducer → Supports multiple threads tied to code ranges.  
- **Tooling:** GitHub + Markdown → Familiar workflows and clear documentation.  

This resource stack balances **ease of setup/debugging**, **developer experience**, and **scalability** for production-grade reviews.
