# OrgDoc AI — Centralized Documentation & Event Archive Platform

OrgDoc AI is a full-stack platform for organizations to manage events, documents, media, and AI-powered search in a single workspace.

## Tech Stack

- Frontend: React 18, Vite, Tailwind CSS, Framer Motion
- Backend: Node.js, Express.js
- Database: PostgreSQL, Prisma ORM
- Storage: Cloudinary for file storage
- Authentication: JWT access + refresh tokens
-- AI / RAG: Grok (preferred) or Google Gemini + LangChain + ChromaDB
- File Parsing: `pdf-parse`, `mammoth`, `xlsx`

---

## Features

- Organization and event management
- File uploads for documents, spreadsheets, images, and videos
- Cloudinary-backed secure file storage
- Event-level document organization
- AI chatbot and semantic search over indexed documents
- Document parsing and indexing with ChromaDB
- File preview and download workflows
- Admin file deletion and user role enforcement

---

## Project Structure

```bash
orgdoc-ai/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Express route handlers
│   │   ├── middleware/       # Auth, file upload, error handling
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic, AI, indexing
│   │   └── utils/            # Helpers and integrations
│   ├── uploads/              # Temporary file storage
│   ├── prisma/               # Prisma schema and migrations
│   ├── .env.example          # Backend environment example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── store/            # State management
│   │   ├── styles/           # CSS and Tailwind
│   │   └── utils/            # API client and helpers
│   ├── .env.example          # Frontend environment example
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Cloudinary account for file assets
-- Grok or Google Gemini API access for AI features (optional)

### Install Dependencies

```bash
git clone <your-repo-url>
cd orgdoc-ai

cd backend && npm install
cd ../frontend && npm install
```

### Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `backend/.env` and `frontend/.env` with your own values.

### Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### Start Development

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

---

## Backend Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Run backend with nodemon |
| `npm start` | Run backend in production mode |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Launch Prisma Studio |

---

## Frontend Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Run Vite development server |
| `npm run build` | Build production assets |
| `npm run preview` | Preview production build |

---

## Environment Variables

### Backend (`backend/.env`)

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GROK_API_KEY` (preferred) — or `GEMINI_API_KEY` as a fallback
- `CHROMA_HOST`
- `CHROMA_PORT`
- `FRONTEND_URL`
- `MAX_FILE_SIZE_MB`
- `MAX_IMAGE_SIZE_MB`

### Frontend (`frontend/.env`)

- `VITE_API_URL` — e.g. `http://localhost:5000/api`

---

## API Overview

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/register` | Register organization/admin |
| `POST` | `/api/auth/login` | Login and receive JWT tokens |
| `POST` | `/api/auth/logout` | Logout and revoke refresh token |
| `GET` | `/api/auth/me` | Get current user details |
| `GET` | `/api/events` | List organization events |
| `POST` | `/api/events` | Create an event |
| `GET` | `/api/events/:id` | Get event details and files |
| `GET` | `/api/files` | List all organization files |
| `GET` | `/api/files/event/:eventId` | List files for an event |
| `POST` | `/api/files/event/:eventId/upload` | Upload a file |
| `POST` | `/api/files/event/:eventId/upload-many` | Upload multiple files |
| `DELETE` | `/api/files/:id` | Delete a file |
| `POST` | `/api/chat` | Send AI chat query |
| `GET` | `/api/analytics` | Get analytics summary |

---

## Architecture Overview

### Backend

- Express server with route controllers
- Prisma ORM for PostgreSQL access
- Cloudinary integration for file uploads
- JWT authentication and authorization
- AI & RAG workflows with ChromaDB and Gemini

### Frontend

- React single-page application
- React Query for data fetching
- Zustand for auth state
- Tailwind CSS for UI styling
- File upload and preview components

---

## Deployment

### Backend

- Configure environment variables in your hosting provider
- Run Prisma migrations
- Start with `npm start`

### Frontend

- Set `VITE_API_URL` to backend production endpoint
- Build with `npm run build`
- Deploy the `dist/` folder

---

## Notes

- Files uploaded through the frontend are stored in Cloudinary and indexed in PostgreSQL.
- AI search uses document embeddings and semantic retrieval.
- The app supports organization-level scope and event-specific file organization.

---

## License

Add your preferred license here.
