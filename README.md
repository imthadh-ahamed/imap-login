# Gmail Email Manager

A full-stack application for managing Gmail emails using OAuth2 authentication, built with React.js and Node.js.

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/imthadh-ahamed/imap-login.git
cd imap-login
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in the backend directory (see `.env.example`):

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=gmail_app

# Google OAuth2 Credentials
CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REDIRECT_URI=http://localhost:5000/auth/google/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Create the database:

```bash
node migrations/createdb.js
```

Start the backend server:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` file in the frontend directory (see `.env.example`):

```env
REACT_APP_API_URL=http://localhost:5000
```

Start the frontend development server:

```bash
npm start
```

## 🔑 Google OAuth2 Setup

> **📖 For detailed IMAP/SMTP configuration and troubleshooting, see [GMAIL_SETUP.md](backend/GMAIL_SETUP.md)**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
7. Copy Client ID and Client Secret to your `.env` file

### Required OAuth Scopes:
- `https://mail.google.com/` (Gmail IMAP access)
- `profile` (User profile information)
- `email` (User email address)

### Enable IMAP in Gmail:
1. Log in to Gmail
2. Settings → Forwarding and POP/IMAP
3. Enable IMAP
4. Save Changes

**IMAP Configuration (Auto-configured):**
- Server: `imap.gmail.com`
- Port: `993`
- Security: SSL/TLS
- Authentication: OAuth2