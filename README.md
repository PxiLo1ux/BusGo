# BusGo - Bus Ticket Booking Platform

A modern bus-ticket searching and booking platform for Nepal.

## Features

- 🚌 **Bus Search**: Find buses between destinations with real-time availability
- 🪑 **Seat Selection**: Interactive vertical bus layout with A/B column naming
- 💳 **Stripe Payments**: Secure payment processing
- 📊 **Driver Dashboard**: Manage buses, routes, schedules, and view earnings
- 👨‍💼 **Admin Dashboard**: Verify drivers/buses, view reports
- 🗺️ **Google Maps Integration**: Route visualization

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Payments**: Stripe
- **Maps**: Google Maps API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (running on port 5433)
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd BusGO
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

**Backend** (backend/.env):
```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/busgo"
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"
STRIPE_SECRET_KEY="sk_test_..."
PORT=5000
```

**Frontend** (frontend/.env):
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

4. Set up the database:
```bash
cd backend
npx prisma generate
npx prisma db push
```

5. Run the development servers:
```bash
npm run dev
```

This starts:
- Frontend at http://localhost:3000
- Backend at http://localhost:5000

## Project Structure

```
BusGO/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context (Auth)
│   │   └── services/       # API services
│   └── ...
├── backend/                # Express backend
│   ├── src/
│   │   ├── modules/        # API modules
│   │   │   ├── auth/       # Authentication
│   │   │   ├── search/     # Bus search
│   │   │   ├── bookings/   # Booking management
│   │   │   ├── drivers/    # Driver operations
│   │   │   ├── admin/      # Admin operations
│   │   │   └── payments/   # Stripe integration
│   │   └── middleware/     # Auth, error handling
│   └── prisma/             # Database schema
└── shared/                 # Shared types
```

## Seat Naming Convention

- **A Column** (Driver side - Right in Nepal): 1A, 2A, 3A...
- **B Column** (Door side - Left): 1B, 2B, 3B...

Seats are displayed in a vertical bus outline matching real tourist bus layout.

## License

MIT
