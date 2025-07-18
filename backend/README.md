# Vault Whisper Zero Trust - Backend

This is the backend service for the Vault Whisper Zero Trust password manager application. It provides a secure API for storing and retrieving encrypted vault entries.

## Technology Stack

- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with Prisma ORM
- **JWT** for authentication
- **Argon2** for password hashing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

## TypeScript Configuration

The backend uses TypeScript for type safety. The TypeScript configuration is defined in `tsconfig.json`.

### Type Definitions

The following type definition packages are used:

- **@types/compression**: Type definitions for compression middleware
- **@types/cors**: Type definitions for CORS middleware
- **@types/express**: Type definitions for Express framework
- **@types/jsonwebtoken**: Type definitions for JWT library
- **@types/morgan**: Type definitions for Morgan logger
- **@types/node**: Type definitions for Node.js
- **@types/uuid**: Type definitions for UUID library
- **@types/aria-query**: Type definitions for aria-query library (used by testing libraries)

## Development

### Available Scripts

- **npm run dev**: Start development server with hot reload
- **npm run build**: Build for production
- **npm run start**: Start production server
- **npm run test**: Run tests
- **npm run lint**: Run linter
- **npm run lint:fix**: Run linter and fix issues

### Database Management

- **npm run migrate**: Run database migrations
- **npm run migrate:prod**: Run migrations in production
- **npm run db:generate**: Generate Prisma client
- **npm run db:studio**: Open Prisma Studio

## API Documentation

API endpoints are documented in the main project README and in the API_SPECIFICATION.md file.

## Deployment

The backend can be deployed using Docker. See the main project README for Docker deployment instructions.

## Security Considerations

- All sensitive data is encrypted client-side before being sent to the backend
- The backend only stores encrypted data and never has access to encryption keys
- JWT tokens are used for authentication
- Rate limiting is implemented to prevent brute force attacks
- CORS is configured to restrict access to the API

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors related to missing type definitions, install the appropriate @types package:

```bash
npm install --save-dev @types/package-name
```

For example, the `@types/aria-query` package was added to resolve TypeScript errors related to the aria-query library used by testing libraries.