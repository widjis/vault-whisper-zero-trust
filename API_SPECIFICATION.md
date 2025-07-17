
# SecureVault API Specification

## Overview

The SecureVault API provides secure endpoints for user authentication and encrypted vault management. All sensitive data is encrypted client-side before transmission.

## Base Configuration

```
Base URL: https://api.securevault.company.com/v1
Content-Type: application/json
Authentication: Bearer JWT tokens
```

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@company.com",
  "passwordHash": "base64-encoded-argon2id-hash",
  "salt": "base64-encoded-32-byte-salt"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@company.com",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "jwt-token-here"
  }
}
```

**Error Responses:**
```json
// 400 Bad Request - Invalid input
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid email format",
    "details": ["Email must be a valid email address"]
  }
}

// 409 Conflict - User exists
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "An account with this email already exists"
  }
}
```

### POST /auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@company.com",
  "passwordHash": "base64-encoded-argon2id-hash"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@company.com",
      "salt": "base64-encoded-32-byte-salt",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "jwt-token-here"
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized - Invalid credentials
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}

// 429 Too Many Requests - Rate limited
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many login attempts. Try again in 15 minutes."
  }
}
```

### POST /auth/logout

Invalidate the current session token.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### POST /auth/refresh

Refresh an expiring JWT token.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token-here",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

## Vault Entry Endpoints

### GET /entries

Retrieve all encrypted vault entries for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
```
?page=1&limit=50&sort=createdAt&order=desc
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "uuid-v4",
        "title": "Gmail Account",
        "encryptedData": {
          "iv": "base64-encoded-12-byte-iv",
          "ciphertext": "base64-encoded-ciphertext",
          "tag": "base64-encoded-16-byte-auth-tag"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 125,
      "pages": 3
    }
  }
}
```

### POST /entries

Create a new encrypted vault entry.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Gmail Account",
  "encryptedData": {
    "iv": "base64-encoded-12-byte-iv",
    "ciphertext": "base64-encoded-ciphertext",
    "tag": "base64-encoded-16-byte-auth-tag"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "uuid-v4",
      "title": "Gmail Account",
      "encryptedData": {
        "iv": "base64-encoded-12-byte-iv",
        "ciphertext": "base64-encoded-ciphertext",
        "tag": "base64-encoded-16-byte-auth-tag"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### GET /entries/:id

Retrieve a specific encrypted vault entry.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "uuid-v4",
      "title": "Gmail Account",
      "encryptedData": {
        "iv": "base64-encoded-12-byte-iv",
        "ciphertext": "base64-encoded-ciphertext",
        "tag": "base64-encoded-16-byte-auth-tag"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### PUT /entries/:id

Update an existing encrypted vault entry (full replacement).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "Updated Gmail Account",
  "encryptedData": {
    "iv": "base64-encoded-12-byte-iv",
    "ciphertext": "base64-encoded-new-ciphertext",
    "tag": "base64-encoded-16-byte-auth-tag"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "uuid-v4",
      "title": "Updated Gmail Account",
      "encryptedData": {
        "iv": "base64-encoded-12-byte-iv",
        "ciphertext": "base64-encoded-new-ciphertext",
        "tag": "base64-encoded-16-byte-auth-tag"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T15:45:00Z"
    }
  }
}
```

### PATCH /entries/:id

Partially update an encrypted vault entry.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "title": "New Title Only"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "uuid-v4",
      "title": "New Title Only",
      "encryptedData": {
        "iv": "base64-encoded-12-byte-iv",
        "ciphertext": "base64-encoded-existing-ciphertext",
        "tag": "base64-encoded-16-byte-auth-tag"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T16:20:00Z"
    }
  }
}
```

### DELETE /entries/:id

Delete a vault entry permanently.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Entry deleted successfully"
}
```

## User Management Endpoints

### GET /user/profile

Get current user profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "user@company.com",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-01-15T14:20:00Z",
      "entryCount": 42
    }
  }
}
```

### PATCH /user/profile

Update user profile (email only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "email": "newemail@company.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "newemail@company.com",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T16:30:00Z"
    }
  }
}
```

### POST /user/change-password

Change user's master password (re-encrypts all vault data).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "currentPasswordHash": "base64-encoded-current-hash",
  "newPasswordHash": "base64-encoded-new-hash",
  "newSalt": "base64-encoded-new-32-byte-salt",
  "reencryptedEntries": [
    {
      "id": "uuid-v4",
      "encryptedData": {
        "iv": "base64-encoded-12-byte-iv",
        "ciphertext": "base64-encoded-new-ciphertext",
        "tag": "base64-encoded-16-byte-auth-tag"
      }
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "newToken": "new-jwt-token-here"
  }
}
```

### DELETE /user/account

Delete user account and all associated data.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "passwordHash": "base64-encoded-current-hash",
  "confirmation": "DELETE_MY_ACCOUNT"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Export/Import Endpoints

### GET /export/vault

Export all vault data in encrypted format.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "export": {
      "version": "1.0",
      "created": "2024-01-15T16:45:00Z",
      "user": {
        "email": "user@company.com",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      "entries": [
        {
          "id": "uuid-v4",
          "title": "Gmail Account",
          "encryptedData": {
            "iv": "base64-encoded-12-byte-iv",
            "ciphertext": "base64-encoded-ciphertext",
            "tag": "base64-encoded-16-byte-auth-tag"
          },
          "createdAt": "2024-01-15T10:30:00Z",
          "updatedAt": "2024-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

### POST /import/vault

Import vault data from encrypted backup.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "importData": {
    "version": "1.0",
    "entries": [
      {
        "title": "Imported Entry",
        "encryptedData": {
          "iv": "base64-encoded-12-byte-iv",
          "ciphertext": "base64-encoded-ciphertext",
          "tag": "base64-encoded-16-byte-auth-tag"
        }
      }
    ]
  },
  "options": {
    "skipDuplicates": true,
    "overwriteExisting": false
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "imported": 5,
    "skipped": 2,
    "errors": 0,
    "details": [
      {
        "title": "Gmail Account",
        "status": "imported",
        "id": "new-uuid-v4"
      },
      {
        "title": "Facebook",
        "status": "skipped",
        "reason": "duplicate_title"
      }
    ]
  }
}
```

## Error Response Format

All API errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": ["Additional error details"],
    "timestamp": "2024-01-15T16:45:00Z",
    "requestId": "req-uuid-v4"
  }
}
```

## Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

| Endpoint Category | Limit | Window |
|------------------|-------|---------|
| Authentication | 5 requests | 15 minutes |
| Vault Operations | 100 requests | 1 minute |
| Export/Import | 3 requests | 1 hour |
| Profile Updates | 10 requests | 1 hour |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642253400
```

## Security Headers

All API responses include security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## JWT Token Format

JWT tokens contain the following payload:

```json
{
  "sub": "user-uuid-v4",
  "email": "user@company.com",
  "iat": 1642249800,
  "exp": 1642336200,
  "iss": "securevault-api",
  "aud": "securevault-client"
}
```

Token expiration: 24 hours
Refresh window: 1 hour before expiration

## Webhook Support (Future)

Planned webhook events for integrations:

- `user.created`
- `user.deleted`
- `entry.created`
- `entry.updated`
- `entry.deleted`
- `security.breach_detected`
- `security.suspicious_activity`

This API specification provides comprehensive coverage for all SecureVault operations while maintaining security and usability standards.
