# OrgDoc AI

A centralized documentation and event archive platform for organizations, clubs, institutions, and teams. Built as a production-ready web app with AI-powered search and document management.

---

## Live Demo

- **Frontend:** Deployed on Vercel
- **Backend:** Deployed on Railway
- **Database + Storage:** Supabase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express.js |
| Database | PostgreSQL via Supabase |
| File Storage | Supabase Storage |
| Authentication | JWT (access + refresh tokens) |
| AI Chat | Groq API (llama-3.3-70b-versatile) |
| Vector Search | ChromaDB (built-in embeddings) |
| File Parsing | pdf-parse, mammoth, xlsx |

---

## Features

### Organization Management
- Register your organization with a unique ID
- JWT-based login with access and refresh tokens
- Role-based access — Admin and Member roles
- Admin-only file deletion

### Event Management
- Create events with title, description, date, category, coordinator, and tags
- Filter events by category and year
- Global search bar with live dropdown results
- Click any result to go directly to the event

### File Management (per event)
- **Documents tab** — upload PDF, DOCX, DOC, TXT files
- **Excel / Data tab** — upload XLSX, XLS, CSV files
- **Photos & Media tab** — upload JPG, PNG, WEBP images
- Drag and drop upload with progress bar
- Photo gallery with fullscreen lightbox and keyboard navigation
- File preview, download, and delete (admin only)
- All files stored securely in Supabase Storage

### AI Assistant
- Ask questions about your events and documents in plain language
- RAG pipeline — documents are indexed into ChromaDB on upload
- Groq (llama-3.3-70b) generates answers with source citations
- Conversation history maintained per organization
- Example queries:
  - "Who coordinated the AI workshop?"
  - "Find the report from March 2025"
  - "How many photos from the robotics event?"

### Analytics Dashboard
- Total events, documents, and members summary
- Events by category (pie chart)
- Monthly event breakdown (bar chart)
- Storage usage by file type

### UI/UX
- Collapsible sidebar with smooth animation
- Collapse/expand button on sidebar edge
- Tooltips on collapsed sidebar icons
- Clean interface — Lucide icons, no emojis
- Mobile responsive layout
- PWA support — installable on Android and iOS

---

## Project Structure

```
orgdoc-ai/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL schema
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── event.controller.js
│   │   │   ├── file.controller.js
│   │   │   ├── chat.controller.js
│   │   │   └── analytics.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js  # JWT verification
│   │   │   ├── upload.middleware.js # Multer config
│   │   │   └── error.middleware.js
│   │   ├── routes/                # Express routers
│   │   ├── services/
│   │   │   └── rag.service.js     # AI + ChromaDB pipeline
│   │   └── index.js               # Express server entry
│   ├── .env.example
│   ├── package.json
│   └── railway.json               # Railway deployment config
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons/                 # PWA icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── AuthPage.jsx
│   │   │   ├── shared/
│   │   │   │   ├── AppLayout.jsx  # Collapsible sidebar + global search
│   │   │   │   └── InstallPrompt.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   ├── events/
│   │   │   │   ├── EventsPage.jsx
│   │   │   │   ├── EventCard.jsx
│   │   │   │   └── EventDetail.jsx # File tabs + photo lightbox
│   │   │   ├── documents/
│   │   │   │   └── DocumentsPage.jsx
│   │   │   ├── analytics/
│   │   │   │   └── AnalyticsPage.jsx
│   │   │   └── chatbot/
│   │   │       └── ChatbotPage.jsx
│   │   ├── store/
│   │   │   └── authStore.js       # Zustand auth state
│   │   ├── utils/
│   │   │   └── api.js             # Axios client + interceptors
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vercel.json                # SPA routing fix for Vercel
│   ├── vite.config.js             # Vite + PWA plugin config
│   └── package.json
├── railway.json                   # Root Railway config
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A Groq API key (free at console.groq.com)
- ChromaDB running locally or on a server

### 1. Clone the repo

```bash
git clone https://github.com/Alaska2005/OrgDocAI.git
cd OrgDocAI
```

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Set up environment variables

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_BUCKET=orgdoc-files

GROQ_API_KEY=gsk_your_groq_key

CHROMA_HOST=localhost
CHROMA_PORT=8000

FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE_MB=50
MAX_IMAGE_SIZE_MB=1000
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Set up Supabase Storage

1. Go to Supabase dashboard → Storage → New bucket
2. Name: `orgdoc-files`
3. Toggle Public: ON

### 5. Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Start ChromaDB locally

```bash
pip install chromadb
chroma run --host localhost --port 8000
```

### 7. Start development servers

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## API Reference

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register organization | No |
| POST | `/api/auth/login` | Login | No |
| POST | `/api/auth/logout` | Logout | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/events` | List events (search, filter) | Yes |
| POST | `/api/events` | Create event | Yes |
| GET | `/api/events/:id` | Get event with files | Yes |
| PUT | `/api/events/:id` | Update event | Yes |
| DELETE | `/api/events/:id` | Delete event | Admin |
| GET | `/api/files` | List all org files | Yes |
| GET | `/api/files/event/:id` | List files for event | Yes |
| POST | `/api/files/event/:id/upload` | Upload single file | Yes |
| POST | `/api/files/event/:id/upload-many` | Upload multiple files | Yes |
| DELETE | `/api/files/:id` | Delete file | Admin |
| POST | `/api/chat` | Send AI chat message | Yes |
| GET | `/api/chat/history` | Get chat history | Yes |
| DELETE | `/api/chat/history` | Clear chat history | Admin |
| GET | `/api/analytics` | Get dashboard analytics | Yes |

---

## AI Architecture

```
User Query
    │
    ▼
ChromaDB Semantic Search (built-in embeddings — no API cost)
    │
    ▼
Relevant document chunks retrieved
    │
    ▼
Postgres keyword search for matching events
    │
    ▼
Context assembled (events + document excerpts)
    │
    ▼
Groq API — llama-3.3-70b-versatile
    │
    ▼
Answer + source citations returned to user
```

**Indexing pipeline (on file upload):**
```
File uploaded → Text extracted (pdf-parse / mammoth / xlsx)
    → Split into 1000-char overlapping chunks
    → ChromaDB upserts chunks with metadata
    → File marked as indexed in PostgreSQL
```

---

## Deployment

### Backend — Railway

Environment variables needed in Railway dashboard:

```
DATABASE_URL, DIRECT_URL, JWT_SECRET, JWT_REFRESH_SECRET,
SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET,
GROQ_API_KEY, CHROMA_HOST, CHROMA_PORT, FRONTEND_URL,
PORT, NODE_ENV, MAX_FILE_SIZE_MB, MAX_IMAGE_SIZE_MB
```

Railway uses `railway.json` at the root:
- **Build:** `cd backend && npm install && npx prisma generate`
- **Pre-deploy:** `cd backend && npx prisma migrate deploy`
- **Start:** `cd backend && npm start`

### Frontend — Vercel

1. Import GitHub repo on Vercel
2. Set Root Directory: `frontend`
3. Add environment variable: `VITE_API_URL=https://your-railway-url.railway.app/api`
4. Deploy

`vercel.json` handles SPA routing so page refresh works correctly.

### ChromaDB — Railway (Docker)

Add a new service in Railway:
- Image: `chromadb/chroma`
- Port: `8000`
- Set `CHROMA_HOST` in backend to the internal Railway URL

---

## PWA — Install on Mobile

### Android (Chrome)
- Open the app URL in Chrome
- A banner will appear automatically — tap **"Install"**
- App appears on home screen like a native app

### iOS (Safari)
- Open the app URL in **Safari** (not Chrome)
- Tap the **Share button** (box with arrow)
- Tap **"Add to Home Screen"**
- Tap **"Add"**

---

## Known Limitations

- ChromaDB free tier on Railway may sleep — semantic search falls back gracefully
- Supabase free tier pauses after 1 week of inactivity — resume from dashboard
- Groq free tier: 14,400 requests/day
- File size limit: 50MB per file (configurable via `MAX_FILE_SIZE_MB`)

---

## License

Add your preferred license here.
