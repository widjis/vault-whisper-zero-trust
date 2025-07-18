# Vault Whisper Zero Trust - Dependencies Documentation

This document provides information about the dependencies used in the Vault Whisper Zero Trust project, including both runtime dependencies and development dependencies.

## Frontend Dependencies

### Runtime Dependencies

- **React**: UI library for building component-based interfaces
- **Material UI**: Component library implementing Material Design
- **Web Crypto API**: Browser API for cryptographic operations
- **Zustand**: State management library

### Development Dependencies

#### TypeScript Type Definitions

The following type definition packages provide TypeScript interfaces for libraries that don't include their own type definitions:

- **@types/react**: Type definitions for React
- **@types/react-dom**: Type definitions for React DOM
- **@types/jest**: Type definitions for Jest testing framework
- **@types/node**: Type definitions for Node.js
- **@types/estree**: Type definitions for ESTree AST specification
- **@types/aria-query**: Type definitions for aria-query library used in accessibility testing

#### Testing Libraries

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **User Event**: Simulates user interactions for testing
- **Playwright**: End-to-end testing framework

## Backend Dependencies

### Runtime Dependencies

- **Express**: Web framework for Node.js
- **Prisma**: ORM for database access
- **JWT**: JSON Web Tokens for authentication
- **Argon2**: Secure password hashing

### Development Dependencies

- **TypeScript**: Programming language adding static types to JavaScript
- **ts-node**: TypeScript execution environment for Node.js
- **nodemon**: Utility for auto-restarting Node.js applications during development
- **Jest**: Testing framework
- **@types/aria-query**: Type definitions for aria-query library

## Why @types/aria-query?

The `@types/aria-query` package provides TypeScript type definitions for the `aria-query` library, which is used by testing libraries like `@testing-library/jest-dom` and `@testing-library/react` for accessibility testing. This dependency is required to avoid TypeScript errors when running tests that involve accessibility queries.

## Managing Dependencies

### Adding New Dependencies

```bash
# Frontend dependencies
npm install --save package-name

# Frontend dev dependencies
npm install --save-dev package-name

# Backend dependencies (from backend directory)
cd backend
npm install --save package-name

# Backend dev dependencies (from backend directory)
cd backend
npm install --save-dev package-name
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update a specific package
npm update package-name
```

### Dependency Security

Regularly check for security vulnerabilities in dependencies:

```bash
npm audit

# Fix vulnerabilities
npm audit fix
```

## Dependency Management Best Practices

1. **Keep dependencies up to date**: Regularly update dependencies to get security fixes and new features
2. **Use exact versions**: Consider using exact versions in package.json to ensure consistent builds
3. **Review new dependencies**: Before adding a new dependency, consider its size, maintenance status, and security history
4. **Audit regularly**: Run `npm audit` regularly to check for security vulnerabilities
5. **Document purpose**: Document why each dependency is needed and how it's used

---

This documentation should be updated whenever dependencies are added, removed, or significantly updated.