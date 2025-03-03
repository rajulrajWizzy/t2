# Coworks Backend API

A TypeScript-based Next.js backend API for a coworking space management system. This project handles user authentication, managing branches, seats, bookings, and payments.

## Technologies Used

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based auth with bcrypt for password hashing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-username/coworks-backend-ts.git
cd coworks-backend-ts
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**

Copy the `.env.example` file to `.env.local` and update the values:

```bash
cp .env.example .env.local
```

Update the database connection details and JWT secret in the `.env.local` file.

4. **Run database migrations**

```bash
npm run migrate
# or
yarn migrate
# or
pnpm migrate
```

5. **Seed the database (optional)**

```bash
npm run seed:branches
npm run seed:seating-types
# or
yarn seed:branches
yarn seed:seating-types
# or
pnpm seed:branches
pnpm seed:seating-types
```

6. **Start the development server**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Routes

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### Branches

- `GET /api/branches` - Get all branches
- `POST /api/branches` - Create a new branch
- `GET /api/branches/:id` - Get a branch by ID
- `PUT /api/branches/:id` - Update a branch
- `DELETE /api/branches/:id` - Delete a branch

### Seating Types

- `GET /api/seating-types` - Get all seating types
- `POST /api/seating-types` - Create a new seating type

### Time Slots

- `GET /api/slots` - Get available time slots
- `POST /api/slots` - Generate time slots for a branch and date

## Database Schema

The database includes the following tables:

- `branches` - Coworking space locations
- `customers` - User accounts
- `seating_types` - Types of workspaces (HOT_DESK, DEDICATED_DESK, etc.)
- `seats` - Individual seats within branches
- `seat_bookings` - Bookings for regular seats
- `meeting_bookings` - Bookings for meeting rooms
- `payments` - Payment records for bookings
- `time_slots` - Available time slots for booking

## Frontend Integration

This backend is designed to work with a Flutter frontend. The API endpoints return JSON responses that can be easily consumed by any frontend application.

## Testing with Postman

You can test the API endpoints using Postman. Import the Postman collection from the `postman` directory to get started.

## Deployment

The application can be deployed to any platform that supports Next.js, such as Vercel or Netlify. Make sure to set up the environment variables in your deployment environment.

## License

[MIT](LICENSE)