# AI-Powered Code Review Assistant - Demo Script

## Quick Start

**Live URLs:**
- **Frontend:** https://main.d3acv2bybjuubu.amplifyapp.com
- **Backend API:** http://ai-code-review-dev.eba-nxub3yxn.us-west-2.elasticbeanstalk.com
- **Local Dev:** http://localhost:5173 (run `npm run dev` in frontend folder)

---

## Demo Overview

This demo showcases an AI-powered code review assistant that provides **contextual, inline feedback** on selected code blocks. The application supports multiple programming languages and delivers actionable suggestions in GitHub-style diff format.

---

## Demo Files

The app includes a **"Load Demo Files"** button that automatically loads three intentionally buggy files:

| File | Language | Bug Types |
|------|----------|-----------|
| `buggy-calculator.js` | JavaScript | Logic errors, missing validation, division by zero |
| `user-service.ts` | TypeScript | Security vulnerabilities, SQL injection, plain-text passwords |
| `api-handler.py` | Python | Hardcoded credentials, eval injection, race conditions |

---

## Demo Flow

### Step 1: Open the Application
1. Navigate to https://main.d3acv2bybjuubu.amplifyapp.com (or http://localhost:5173 for local)
2. You'll see the Monaco code editor (VS Code engine) with a welcome screen

### Step 2: Load Demo Code
1. Click the **"Load Demo Files"** button (green button)
2. Three files will load automatically with syntax highlighting:
   - `buggy-calculator.js` (JavaScript)
   - `user-service.ts` (TypeScript)  
   - `api-handler.py` (Python)

### Step 3: Select Code for Review
1. **Highlight lines 16-18** (the `divide` function):
   ```javascript
   divide(a, b) {
     return a / b;
   }
   ```
2. Click the **"Ask AI"** button (or use the keyboard shortcut)

### Step 4: View AI Response
The AI will analyze the selection with surrounding context and provide:
- **Explanation** of the issue (division by zero not handled)
- **Patch suggestion** in GitHub-style diff format:
  ```diff
  - divide(a, b) {
  -   return a / b;
  - }
  + divide(a, b) {
  +   if (b === 0) {
  +     throw new Error('Cannot divide by zero');
  +   }
  +   return a / b;
  + }
  ```

### Step 5: Continue the Conversation
1. In the same thread, ask a follow-up: *"Can you also return NaN instead of throwing?"*
2. The AI maintains context from the previous exchange

### Step 6: Create Multiple Threads
1. **Select lines 21-23** (the `multiply` function with wrong operator)
2. Request AI feedback - this creates a **new, independent thread**
3. Both threads remain visible and tied to their respective code ranges

### Step 7: Demonstrate Multi-Language Support
1. Click the **`user-service.ts`** tab (already loaded with demo files)
2. Select the `validatePassword` function (lines 48-52)
3. Ask: *"What security issues exist here?"*
4. The AI will identify timing attack vulnerability and password comparison issues

### Step 8: Show Thread Persistence
1. Refresh the page
2. Previously created threads are restored from the database
3. Demonstrate that conversations persist across sessions

---

## PRD Feature Mapping

| PRD Requirement | Demo Feature | How to Verify |
|-----------------|--------------|---------------|
| **Code Editor Interface** (§6) | Monaco Editor with syntax highlighting | Load any demo file - colors indicate language detection |
| **Selection-Based Interaction** (§6) | Highlight + "Ask AI" action | Select any lines and click Ask AI button |
| **Contextual AI Responses** (§6) | ±20 lines surrounding context | AI references code outside selection in response |
| **Patch Suggestions** (§6, §7) | GitHub-style diff blocks | Look for `- old` / `+ new` format in responses |
| **Inline Conversation Threads** (§6) | Threads tied to code ranges | Create thread, see it anchored to selected lines |
| **Thread Persistence** (§6) | Database storage | Refresh page - threads reload |
| **Language-Agnostic** (§2) | JS, TS, Python support | Test all three demo files |
| **Multi-file Context** (§6) | Context includes file metadata | AI response mentions file type/language |

---

## Key Scenarios to Demo

### Scenario A: Bug Detection
**File:** `buggy-calculator.js`
**Selection:** Lines 21-23 (`multiply` function)
**Expected AI Response:** Identifies wrong operator (`+` instead of `*`)

### Scenario B: Security Review
**File:** `user-service.ts`
**Selection:** Lines 21-30 (`createUser` function)
**Expected AI Response:** Identifies:
- Plain-text password storage
- Weak ID generation (Math.random vs UUID)
- Missing password hashing

### Scenario C: Critical Vulnerability
**File:** `api-handler.py`
**Selection:** Lines 15-18 (`handle_request` with `eval`)
**Expected AI Response:** 
- Identifies code injection vulnerability
- Suggests using `ast.literal_eval` or JSON parsing
- Warns about NEVER using eval on user input

### Scenario D: Hardcoded Credentials
**File:** `api-handler.py`
**Selection:** Lines 6-8 (hardcoded credentials)
**Expected AI Response:**
- Identifies credential exposure
- Suggests environment variables
- Recommends secrets manager

---

## Edge Cases to Demonstrate

| Edge Case | How to Demo | Expected Behavior |
|-----------|-------------|-------------------|
| **Large file context** | Paste 500+ line file | AI receives truncated context (~20 lines each side) |
| **Empty selection** | Click without selecting | "Ask AI" is disabled or shows prompt |
| **Token limits** | Select 200+ lines | Context intelligently truncated |
| **Overlapping threads** | Create threads on adjacent code | Each thread remains independent |

---

## Technical Architecture Shown

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    OpenAI       │
│  (AWS Amplify)  │     │    (AWS EB)     │     │     API         │
│  React+Monaco   │     │  Node/Express   │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    AWS RDS      │
                        │   PostgreSQL    │
                        │  (Thread Store) │
                        └─────────────────┘
```

---

## Acceptance Criteria Checklist

From PRD §11, verify during demo:

- [x] **Code editor supports syntax highlighting and selections** → Monaco Editor
- [x] **AI feedback tied to selected code blocks** → Thread appears at selection
- [x] **Inline threads persist across sessions** → Refresh page, threads remain
- [x] **Patch suggestions in GitHub-style diff format** → `- / +` format in responses
- [x] **Multi-file context supported** → Language detection in prompts
- [x] **Backend stores/retrieves threads reliably** → Persistence works

---

## Demo Tips

1. **Start simple**: Use `buggy-calculator.js` first (easy bugs, clear fixes)
2. **Show the diff format**: Highlight when AI produces `- old / + new` suggestions
3. **Emphasize persistence**: Always refresh to show threads survive
4. **Multi-language**: Switch between JS → TS → Python to show flexibility
5. **Security angle**: The TypeScript and Python files have security bugs that resonate with enterprise audiences

---

## Testing Locally

To run the frontend locally pointed to the deployed backend:

```bash
cd frontend
echo "VITE_API_URL=http://ai-code-review-dev.eba-nxub3yxn.us-west-2.elasticbeanstalk.com" > .env.local
npm run dev
```

Then open http://localhost:5173

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API not responding | Check backend health: `curl http://ai-code-review-dev.eba-nxub3yxn.us-west-2.elasticbeanstalk.com/health` |
| Threads not loading | Verify database connection in backend logs |
| CORS errors | Backend CORS is configured for the Amplify domain |
| Slow responses | OpenAI API latency varies; typical response: 2-5 seconds |
| "Ask AI" button not appearing | Make sure you've selected multiple lines (not just cursor position) |

---

## Future Enhancements (from PRD §10)

Mention these as roadmap items during demo:
- Multi-user collaboration
- Team analytics dashboards
- Export to Markdown/JSON
- GitHub/GitLab integration
- Enterprise compliance features

