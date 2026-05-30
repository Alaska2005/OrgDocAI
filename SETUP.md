# OrgDoc AI - Quick Start Guide

## 📋 Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Python 3.8+ (for ChromaDB)
- Git

## 🚀 Setup Steps

### 1. Clone & Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

```bash
cd backend

# Create PostgreSQL database
createdb orgdoc_ai

# Set DATABASE_URL in .env
# Example: postgresql://user:password@localhost:5432/orgdoc_ai

# Run migrations
npx prisma migrate dev
```

### 3. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# ─── Server ───────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ─── Database ─────────────────────────────────────────────
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/orgdoc_ai

# ─── Authentication ───────────────────────────────────────
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Cloudinary (File Storage) ────────────────────────────
# Sign up at https://cloudinary.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ─── AI Chat Key (Grok / Google Gemini) ────────────────────
# Preferred: Grok API key (set as GROK_API_KEY). For compatibility you may set GEMINI_API_KEY.
# Grok key example: GROK_API_KEY=gsk_xxx
GROK_API_KEY=your_grok_api_key

# ─── ChromaDB (Vector Database) ────────────────────────────
CHROMA_HOST=localhost
CHROMA_PORT=8000

# ─── Frontend URL (CORS) ───────────────────────────────────
FRONTEND_URL=http://localhost:5173
```

### 4. Start ChromaDB (Vector Database)

```bash
# Install ChromaDB CLI
pip install chromadb

# Start server (keep this terminal open)
chroma run --path ./chroma
```

Or with Docker:
```bash
docker run -p 8000:8000 ghcr.io/chroma-core/chroma:latest
```

### 5. Start Backend Server

```bash
cd backend
npm run dev
# Should see: "OrgDoc AI Backend is running 🚀 on port 5000"
```

### 6. Start Frontend Server

```bash
cd frontend
npm run dev
# Should see: "VITE v5.x.x  ready in XXX ms
#            ➜  Local: http://localhost:5173/"
```

### 7. Access Application

Open browser and go to: **http://localhost:5173**

## 🔧 Development Commands

### Backend
```bash
cd backend

# Development server with auto-reload
npm run dev

# Production build
npm run build

# Run tests
npm test

# Database migrations
npx prisma migrate dev --name your_migration_name
npx prisma studio  # Visual database browser
```

### Frontend
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

## ✅ Verify Setup

### Backend Health Check
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Frontend
```bash
# Should open http://localhost:5173 without errors
npm run dev
```

### Test Full Stack
1. Navigate to http://localhost:5173
2. Create an organization account
3. Upload a document
4. Chat with the AI about the document
5. View analytics dashboard

## ❌ Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions to common errors:

| Error | Cause | Solution |
|-------|-------|----------|
| `BigInt serialization` | Database query issue | See TROUBLESHOOTING.md #1 |
| `Unknown API key` | Missing credentials | See TROUBLESHOOTING.md #2 |
| `ChromaDB not found` | Vector DB not running | See TROUBLESHOOTING.md #3 |
| `JSON parse error` | Invalid Gemini response | See TROUBLESHOOTING.md #4 |
| `File upload fails` | Cloudinary misconfigured | See TROUBLESHOOTING.md #5 |

## 🏗️ Project Structure

```
orgdoc-ai/
├── backend/
│   ├── src/
│   │   ├── controllers/    # API endpoint handlers
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic (RAG, file processing)
│   │   ├── middleware/     # Auth, error handling
│   │   └── utils/          # Cloudinary config, helpers
│   ├── prisma/             # Database schema & migrations
│   ├── package.json
│   └── .env                # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components (auth, chat, etc)
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand state management
│   │   ├── utils/          # API client, helpers
│   │   └── styles/         # Tailwind CSS
│   ├── package.json
│   └── vite.config.js
│
└── chroma/                 # ChromaDB vector database data
```

## 📚 Key Endpoints

### Authentication
- `POST /api/auth/register` - Create organization
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details

### Files
- `POST /api/files/event/:eventId/upload` - Upload file
- `GET /api/files` - List files
- `GET /api/files?type=DOCUMENT` - Filter by type

### Chat (RAG)
- `POST /api/chat` - Send message
- `GET /api/chat/history` - Chat history

### Analytics
- `GET /api/analytics` - Dashboard data

## 🔐 Security Notes

- **Change JWT secrets** in production (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- **Never commit `.env`** to git (it's in .gitignore)
- **Use environment variables** for all sensitive data
- **Enable HTTPS** in production
- **Set proper CORS** origins in production

## 📝 API Documentation

Interactive API docs available at: `http://localhost:5000/api-docs` (if Swagger configured)

## 🆘 Need Help?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review backend logs: `npm run dev` output
3. Check frontend console: Browser DevTools > Console
4. Check ChromaDB status: `curl http://localhost:8000`
5. Verify database: `npx prisma studio`

---

**Happy coding! 🚀**
