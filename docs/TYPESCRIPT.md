# Vault Whisper Zero Trust - TypeScript Configuration Guide

This document provides information about TypeScript configuration in the Vault Whisper Zero Trust project, including type definitions, compiler options, and best practices.

## TypeScript Configuration Files

### Frontend TypeScript Configuration

The frontend uses a split TypeScript configuration approach:

- **tsconfig.json**: Base configuration that references other configuration files
- **tsconfig.app.json**: Configuration for the application code
- **tsconfig.node.json**: Configuration for Node.js-specific code

### Backend TypeScript Configuration

The backend uses a single TypeScript configuration file:

- **backend/tsconfig.json**: Configuration for the backend Node.js application

## Type Definitions (@types packages)

The project uses several TypeScript definition packages to provide type information for libraries that don't include their own type definitions:

### Frontend Type Definitions

- **@types/react**: Type definitions for React
- **@types/react-dom**: Type definitions for React DOM
- **@types/jest**: Type definitions for Jest testing framework
- **@types/node**: Type definitions for Node.js
- **@types/estree**: Type definitions for ESTree AST specification

### Backend Type Definitions

- **@types/compression**: Type definitions for compression middleware
- **@types/cors**: Type definitions for CORS middleware
- **@types/express**: Type definitions for Express framework
- **@types/jsonwebtoken**: Type definitions for JWT library
- **@types/morgan**: Type definitions for Morgan logger
- **@types/node**: Type definitions for Node.js
- **@types/uuid**: Type definitions for UUID library
- **@types/aria-query**: Type definitions for aria-query library

## Recently Added Type Definitions

### @types/aria-query

The `@types/aria-query` package was added to provide TypeScript type definitions for the `aria-query` library, which is used by testing libraries like `@testing-library/jest-dom` and `@testing-library/react` for accessibility testing. This dependency is required to avoid TypeScript errors when running tests that involve accessibility queries.

Installation:
```bash
cd backend
npm install --save-dev @types/aria-query
```

## TypeScript Compiler Options

### Frontend Compiler Options

Key compiler options in the frontend configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Backend Compiler Options

Key compiler options in the backend configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

## TypeScript Best Practices

1. **Use strict mode**: Enable TypeScript's strict mode to catch more potential issues
2. **Avoid `any` type**: Use specific types or `unknown` instead of `any`
3. **Use type inference**: Let TypeScript infer types when possible
4. **Create custom types**: Define custom types for complex data structures
5. **Use discriminated unions**: For handling different states or variants
6. **Use readonly**: Mark properties as readonly when they shouldn't change
7. **Use type guards**: Narrow types with type guards for better type safety

## Common TypeScript Issues and Solutions

### Missing Type Definitions

If you encounter errors about missing type definitions, install the appropriate @types package:

```bash
npm install --save-dev @types/package-name
```

### Type Definition Conflicts

If you encounter conflicts between type definitions, try:

1. Updating to the latest versions of all related packages
2. Using more specific import paths
3. Adding type assertions where necessary

### skipLibCheck

The `skipLibCheck` option is enabled to avoid checking type definitions in node_modules, which can cause issues with conflicting type definitions. This is a performance optimization but may hide some type errors in dependencies.

---

This documentation should be updated whenever TypeScript configuration changes or new type definition packages are added.