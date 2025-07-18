# Vault Whisper Frontend

This is the frontend application for the Vault Whisper Zero Trust password management system. It's built with React, TypeScript, and Material UI.

## Features

- Secure authentication with JWT
- User dashboard with statistics
- Vault entry management (create, read, update, delete)
- User profile management
- Admin dashboard with user management and audit logs
- Responsive design for desktop and mobile
- Dark/light theme support

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies:

```bash
npm install
# or
yarn install
```

## Development

To start the development server:

```bash
npm start
# or
yarn start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `build/` directory.

## Type Checking

To run TypeScript type checking:

```bash
npm run typecheck
# or
yarn typecheck
```

## Linting

To run ESLint:

```bash
npm run lint
# or
yarn lint
```

To automatically fix linting issues:

```bash
npm run lint:fix
# or
yarn lint:fix
```

## Project Structure

- `src/`: Source code
  - `components/`: Reusable UI components
    - `admin/`: Admin-specific components
    - `common/`: Common components used throughout the app
  - `contexts/`: React contexts for state management
  - `pages/`: Page components
  - `routes/`: Route definitions
  - `theme/`: Theme configuration
  - `utils/`: Utility functions
  - `App.tsx`: Main application component
  - `index.tsx`: Application entry point

## Backend Integration

The frontend is configured to proxy API requests to the backend server running on port 3001. This is set in the `package.json` file with the `"proxy": "http://localhost:3001"` setting.

## Authentication

Authentication is handled using JWT tokens. The tokens are stored in memory (not in localStorage for security reasons) and are included in API requests using the `fetchWithAuth` utility function.

## Responsive Design

The application is designed to be responsive and work well on both desktop and mobile devices. Material UI's responsive design features are used throughout the application.

## Theming

The application supports both light and dark themes. The theme can be toggled using the theme toggle button in the app bar. The theme preference is stored in localStorage.