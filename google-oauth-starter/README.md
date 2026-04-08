# Google OAuth Starter (Separate Module)

This folder gives you a complete Google login flow using:
- Frontend: React + Google Identity Services (`@react-oauth/google`)
- Backend: Node.js + Express
- Token verification: `google-auth-library`
- Database: MongoDB + Mongoose
- App token: your own JWT

It is added as **new files only** and does not change your existing project lines.

## Folder Structure

```text
google-oauth-starter/
  backend/
    .env.example
    package.json
    src/
      config/env.js
      config/db.js
      controllers/authController.js
      middleware/authMiddleware.js
      middleware/errorMiddleware.js
      models/User.js
      routes/authRoutes.js
      routes/userRoutes.js
      utils/generateToken.js
      server.js
  frontend/
    .env.example
    package.json
    index.html
    vite.config.js
    src/
      main.jsx
      App.jsx
      styles.css
      components/GoogleLoginButton.jsx
      services/api.js
```

## Where To Add Secrets and URLs

### Backend (`google-oauth-starter/backend/.env`)
Copy `.env.example` to `.env`, then set:
- `GOOGLE_CLIENT_ID`: from Google Cloud OAuth credentials
- `JWT_SECRET`: long random secret string
- `FRONTEND_URL`: your frontend origin (for CORS), example `http://localhost:5173`
- `MONGO_URI`: MongoDB connection string
- `PORT`: backend port

### Frontend (`google-oauth-starter/frontend/.env`)
Copy `.env.example` to `.env`, then set:
- `VITE_GOOGLE_CLIENT_ID`: same Google Client ID as backend
- `VITE_API_BASE_URL`: backend API base, example `http://localhost:5001/api`

## Run Instructions

1. Backend:
   - `cd google-oauth-starter/backend`
   - `npm install`
   - create `.env`
   - `npm run dev`

2. Frontend:
   - `cd google-oauth-starter/frontend`
   - `npm install`
   - create `.env`
   - `npm run dev`

## API Endpoints

- `POST /api/auth/google`
  - body: `{ "credential": "<google_id_token>" }`
  - verifies Google token, creates/fetches user, returns app JWT + user

- `POST /api/auth/logout`
  - stateless logout response; frontend removes local token

- `GET /api/users/me`
  - protected route with `Authorization: Bearer <jwt>`

## Simple File-by-File Explanation (Line-by-Line Style)

### Backend

- `package.json`
  - Adds runtime packages: Express, CORS, Dotenv, Mongoose, JWT, Google auth library.
  - Adds `nodemon` for development.

- `.env.example`
  - Defines all required runtime configuration values.

- `src/config/env.js`
  - Loads env values.
  - Validates required keys early.
  - Exports one `env` object so other files use consistent config.

- `src/config/db.js`
  - Connects Mongoose to MongoDB using `MONGO_URI`.

- `src/models/User.js`
  - Creates user schema with required fields:
    - `name`, `email`, `googleId`, `picture`, `provider`
  - Adds timestamps.
  - Enforces unique `email` and `googleId`.

- `src/utils/generateToken.js`
  - Signs your own JWT with user ID in `sub`.
  - Uses `JWT_SECRET` and `JWT_EXPIRES_IN`.

- `src/middleware/authMiddleware.js`
  - Reads Bearer token from header.
  - Verifies JWT.
  - Fetches user from DB.
  - Attaches user to `req.user`.

- `src/middleware/errorMiddleware.js`
  - Handles 404 route misses.
  - Sends clean JSON errors with stack only outside production.

- `src/controllers/authController.js`
  - `googleLogin`:
    - Reads `credential` from body.
    - Verifies Google ID token with `google-auth-library`.
    - Extracts Google payload (`sub`, `email`, `name`, `picture`).
    - Finds user by email/googleId.
    - Creates new user if missing.
    - Updates existing profile fields if found.
    - Generates your app JWT and returns it.
  - `logout`:
    - Returns success response (frontend clears token).

- `src/routes/authRoutes.js`
  - Exposes `/google` and `/logout`.

- `src/routes/userRoutes.js`
  - Exposes protected `/me` route using `protect` middleware.

- `src/server.js`
  - Creates Express app.
  - Adds CORS and JSON middleware.
  - Registers routes.
  - Adds error handlers.
  - Connects DB and starts server.

### Frontend

- `package.json`
  - Uses React + Vite + `@react-oauth/google` + `axios`.

- `.env.example`
  - Holds Google client ID and backend API URL.

- `index.html`
  - Root HTML entry mounting React app.

- `vite.config.js`
  - Enables React plugin for Vite.

- `src/main.jsx`
  - Reads Google client ID from env.
  - Wraps app in `GoogleOAuthProvider`.

- `src/services/api.js`
  - Creates axios instance with backend base URL.
  - Exposes helper to set/remove `Authorization` header.

- `src/components/GoogleLoginButton.jsx`
  - Renders Google "Continue with Google" button.
  - On success, gets `credential` and sends it to backend.

- `src/App.jsx`
  - Stores app JWT in localStorage.
  - Calls protected `/users/me` route.
  - Shows login card before auth and profile card after auth.
  - Implements logout flow by calling backend + clearing local token.

- `src/styles.css`
  - Basic demo styling.

## Production Notes (Important)

- Keep `JWT_SECRET` long and rotate periodically.
- Set strict CORS origin to your real frontend domain.
- Use HTTPS in production for frontend and backend.
- Prefer HttpOnly secure cookies for JWT in high-security apps.
- Add rate limiting on `/api/auth/google`.
- Validate ID token `aud` and `iss` exactly (already validated through `verifyIdToken` with audience).
- Add logging/monitoring and avoid sending stack traces in production.
- Handle account linking rules if users can sign in with multiple providers.
