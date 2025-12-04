# AI-Powered Code Review Assistant

A standalone web application that provides intelligent, contextual code review feedback at the block level. Unlike traditional code review processes or generic AI chat interfaces, this assistant delivers precise, actionable insights tied directly to selected code sections.

## Live Demo

- **Frontend:** https://main.d3acv2bybjuubu.amplifyapp.com
- **Backend API:** https://d10sf4kth5hlau.cloudfront.net

## Features

- **Inline Code Review** - Select any code block and get AI-powered feedback
- **Proactive Issue Detection** - Scan entire files for bugs, security issues, and code smells
- **GitHub-Style Diffs** - Receive patch suggestions in familiar diff format
- **Persistent Threads** - Conversation threads tied to specific code ranges
- **Multi-Language Support** - JavaScript, TypeScript, Python, and more
- **Monaco Editor** - VS Code's editor with syntax highlighting
- **Visual Issue Markers** - See problems at a glance with glyph margin icons

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Monaco Editor** - VS Code's editor engine
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tooling

### Backend
- **Node.js** with Express
- **TypeScript** - Type-safe development
- **PostgreSQL** - Thread persistence (AWS RDS)
- **OpenAI GPT-4** - AI code analysis

### Infrastructure
- **AWS Amplify** - Frontend hosting
- **AWS Elastic Beanstalk** - Backend hosting
- **AWS CloudFront** - HTTPS/CDN for API
- **AWS RDS** - PostgreSQL database

## Architecture

```
+-------------------+     +-------------------+     +-------------------+
|    Frontend       |---->|   CloudFront      |---->|    Backend        |
|  (AWS Amplify)    |     |   (HTTPS CDN)     |     |  (Elastic Bean)   |
|  React + Monaco   |     +-------------------+     |  Node/Express     |
+-------------------+                               +--------+----------+
                                                             |
                                                    +--------v----------+
                                                    |    AWS RDS        |
                                                    |   PostgreSQL      |
                                                    +-------------------+
                                                             |
                                                    +--------v----------+
                                                    |    OpenAI API     |
                                                    |      GPT-4        |
                                                    +-------------------+
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL (local or AWS RDS)
- OpenAI API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/AI-Powered-Code-Review-Agent.git
   cd AI-Powered-Code-Review-Agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your credentials:
   # - OPENAI_API_KEY
   # - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
   ```

4. **Run database migrations**
   ```bash
   cd backend
   npm run db:migrate
   ```

5. **Start backend server**
   ```bash
   cd backend
   npm run dev
   ```

6. **Start frontend (new terminal)**
   ```bash
   cd frontend
   npm run dev
   ```

7. **Open browser**
   Navigate to http://localhost:5173

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `code_review` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_MODEL` | Model to use | `gpt-4-turbo-preview` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:5173` |

### Frontend (.env.production)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |

## API Endpoints

### Threads

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/threads` | List all threads |
| `GET` | `/api/threads/:id` | Get thread by ID |
| `POST` | `/api/threads` | Create new thread |
| `POST` | `/api/threads/:id/comments` | Add comment to thread |
| `DELETE` | `/api/threads/:id` | Delete thread |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/review` | Get AI review for selected code |
| `POST` | `/api/ai/scan` | Scan entire file for issues |
| `GET` | `/api/ai/providers` | List available AI providers |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

## Project Structure

```
.
|-- _demo/                    # Demo files with intentional bugs
|-- _docs/                    # Project documentation
|   |-- prd.md               # Product Requirements Document
|   |-- architecture.md      # Architecture decisions
|-- backend/
|   |-- src/
|   |   |-- controllers/     # Request handlers
|   |   |-- db/              # Database connection & migrations
|   |   |-- middleware/      # Express middleware
|   |   |-- models/          # Data models
|   |   |-- routes/          # API routes
|   |   |-- services/ai/     # AI service implementations
|   |   |-- utils/           # Utility functions
|   |   |-- server.ts        # Express app entry point
|   |-- Procfile             # EB process configuration
|   |-- tsconfig.json
|-- frontend/
|   |-- src/
|   |   |-- components/      # React components
|   |   |-- context/         # React context providers
|   |   |-- services/        # API client
|   |   |-- utils/           # Utility functions
|   |   |-- App.tsx          # Main app component
|   |-- deploy.ps1           # Amplify deployment script
|   |-- vite.config.ts
|-- package.json             # Root workspace config
```

## Deployment

### Backend (Elastic Beanstalk)

```bash
cd backend
npm run build
eb deploy --profile your-aws-profile
```

### Frontend (Amplify)

```bash
cd frontend
npm run build
.\deploy.ps1
```

## Testing

### Run all tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Test coverage

```bash
npm run test:coverage
```

## Usage Guide

### Basic Code Review

1. Click **"Load Demo Files"** or create a new file
2. **Select code** you want reviewed (click and drag)
3. Click **"Ask AI"** button
4. View the AI response in the thread panel
5. Continue the conversation with follow-up questions

### Proactive Issue Detection

1. Open a file in the editor
2. Click **"Scan File"** button (orange)
3. Wait for AI analysis (~10-30 seconds)
4. View issue markers in the glyph margin:
   - Red circle = Error
   - Yellow triangle = Warning
   - Blue circle = Info
5. Hover over markers to see issue details
6. Click markers to start a review thread

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Enhancements

- Multi-user collaboration
- GitHub/GitLab integration
- Export to Markdown/JSON
- Team analytics dashboards
- Enterprise compliance features (GDPR, SOC2)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code's editor
- [OpenAI](https://openai.com/) - GPT-4 API
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework



