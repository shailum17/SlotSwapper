# SlotSwapper

Peer-to-peer time slot scheduling application that enables users to exchange calendar time slots with each other.

## Project Structure

```
slot-swapper/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # MongoDB/Mongoose models
│   │   ├── routes/         # API routes
│   │   └── server.ts       # Main server file
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
└── package.json           # Root package.json for scripts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation

1. Clone the repository
2. Install all dependencies:
   ```bash
   npm run install-all
   ```

3. Set up environment variables:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI and JWT secret
   
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env if needed
   ```

### Development

Start both backend and frontend in development mode:
```bash
npm run dev
```

Or start them separately:
```bash
# Backend (runs on http://localhost:5000)
npm run dev:backend

# Frontend (runs on http://localhost:3000)
npm run dev:frontend
```

### Building for Production

```bash
npm run build
```

### Testing

```bash
npm test
```

## Features

- User authentication with JWT
- Calendar event management
- Slot swapping marketplace
- Real-time swap request notifications
- Secure peer-to-peer slot exchanges

## Technology Stack

**Backend:**
- Node.js with Express.js
- TypeScript
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing

**Frontend:**
- React 18 with TypeScript
- React Router for navigation
- Axios for HTTP requests
- Context API for state management

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Events
- `GET /api/events` - Get user's events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Swaps
- `GET /api/swappable-slots` - Get available swappable slots
- `POST /api/swap-request` - Create swap request
- `POST /api/swap-response/:id` - Accept/reject swap request
- `GET /api/swap-requests` - Get user's swap requests

## License

ISC