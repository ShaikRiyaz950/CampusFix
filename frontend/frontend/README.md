# CampusFix Frontend

CampusFix is a responsive React frontend for a campus complaint management system.

## Setup

```powershell
npm install
npm run dev
```

The development server normally opens at `http://localhost:5173`.

## Backend configuration

Copy `.env.example` to `.env` and set the Flask server URL:

```text
VITE_API_BASE_URL=http://localhost:5000
```

Expected API endpoints:

- `POST /api/login`
- `POST /api/register`
- `POST /api/complaints`
- `GET /api/complaints`

## Available routes

- `/` - Home
- `/login` - Student login
- `/register` - Student registration
- `/dashboard` - Student dashboard
- `/complaints` - Submit complaint
- `/track` - Track complaints

## Commands

- `npm run dev` - Start the development server
- `npm run build` - Create the production build
- `npm run lint` - Run Oxlint

## Implementation notes

- API calls are centralized in `src/services/api.js`.
- Login and registration store a returned token and student data locally.
- Complaint submissions use `multipart/form-data` for optional image uploads.
- Tracking loads Flask data and retains demo data when the API is unavailable.
