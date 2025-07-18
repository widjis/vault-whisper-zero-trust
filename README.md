
# SecureVault - Zero Knowledge Password Manager

A self-hosted, zero-knowledge password vault application built for PT Merdeka Tsingshan Indonesia. This application ensures that all sensitive data is encrypted client-side before transmission, providing maximum security and privacy.

## 🔐 Security Features

- **Zero-Knowledge Architecture**: All encryption/decryption happens client-side
- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **Argon2id Key Derivation**: Secure password hashing with configurable parameters
- **Client-Side Salt Generation**: Unique salt per user for enhanced security
- **JWT Authentication**: Secure token-based authentication
- **No Plaintext Storage**: Server never sees unencrypted data

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │   Express API   │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Client Crypto │◄──►│ • JWT Auth      │◄──►│ • Encrypted     │
│ • Web Crypto    │    │ • CRUD Entries  │    │   Data Only     │
│ • AES-256-GCM   │    │ • User Mgmt     │    │ • User Metadata │
│ • Argon2id      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Cryptographic Flow

1. **User Registration**:
   - Generate random salt (32 bytes)
   - Derive encryption key: `Argon2id(password, salt)`
   - Hash for storage: `Argon2id(password, salt)` → Base64
   - Store only: `{email, salt, passwordHash}`

2. **Data Encryption**:
   - Generate random IV (12 bytes)
   - Encrypt: `AES-256-GCM(data, key, iv)`
   - Store: `{iv, ciphertext, authTag}`

3. **Vault Unlocking**:
   - Verify password against stored hash
   - Derive same encryption key
   - Decrypt all vault entries client-side

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for beautiful components
- **Web Crypto API** for encryption
- **argon2-browser** for key derivation

### Backend (Planned)
- **Node.js** with Express or NestJS
- **PostgreSQL** for data storage
- **JWT** for authentication
- **Helmet** for security headers
- **Rate limiting** and **CORS** protection

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ (for backend)
- Modern browser with Web Crypto API support

### Frontend Development

```bash
# Clone the repository
git clone <repository-url>
cd securevault

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables

```env
# Frontend (.env.local)
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=SecureVault
VITE_COMPANY_NAME=PT Merdeka Tsingshan Indonesia

# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/securevault
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
NODE_ENV=production
```

## 🗄️ Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  pw_hash TEXT NOT NULL,
  salt BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Vault entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  iv BYTEA NOT NULL,
  ciphertext BYTEA NOT NULL,
  tag BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at);
CREATE INDEX idx_users_email ON users(email);
```

## 🔌 API Documentation

### Authentication Endpoints

```typescript
POST /api/auth/register
{
  "email": "user@company.com",
  "passwordHash": "base64-encoded-hash",
  "salt": "base64-encoded-salt"
}

POST /api/auth/login
{
  "email": "user@company.com", 
  "passwordHash": "base64-encoded-hash"
}

POST /api/auth/logout
Authorization: Bearer <jwt-token>
```

### Vault Endpoints

```typescript
GET /api/entries
Authorization: Bearer <jwt-token>
Response: Array<EncryptedEntry>

POST /api/entries
Authorization: Bearer <jwt-token>
{
  "title": "Entry Title",
  "iv": "base64-iv",
  "ciphertext": "base64-ciphertext", 
  "tag": "base64-auth-tag"
}

PUT /api/entries/:id
PATCH /api/entries/:id
DELETE /api/entries/:id
```

## 🐳 Docker Deployment

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: securevault
      POSTGRES_USER: vault_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://vault_user:secure_password@postgres:5432/securevault
      JWT_SECRET: your-production-jwt-secret
    ports:
      - "3001:3001"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
```

## 🛡️ Security Considerations

### Implemented
- ✅ Client-side encryption with AES-256-GCM
- ✅ Argon2id key derivation with secure parameters
- ✅ Secure random salt generation per user
- ✅ Session timeout and auto-lock
- ✅ Secure clipboard handling
- ✅ Input validation and sanitization

### Production Recommendations
- 🔲 HTTPS everywhere with HSTS headers
- 🔲 Content Security Policy (CSP)
- 🔲 Rate limiting on authentication endpoints
- 🔲 Database encryption at rest
- 🔲 Regular security audits and penetration testing
- 🔲 Backup encryption and secure key management
- 🔲 Multi-factor authentication (MFA)
- 🔲 Device trust and registration

## 📱 Browser Extension & Mobile Apps

The cryptographic utilities in `/src/lib/crypto.ts` are designed to be portable across:

- **Browser Extension**: Chrome/Firefox extension with same crypto stack
- **Mobile Apps**: React Native with crypto-js fallback
- **Desktop Apps**: Electron wrapper with native crypto modules

## 🔄 Backup & Recovery

### Encrypted Export
```typescript
// Generate encrypted backup
const backup = {
  version: "1.0",
  created: new Date().toISOString(),
  data: encryptedEntries.map(entry => ({
    id: entry.id,
    title: entry.title,
    encryptedData: entry.encryptedData,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  }))
};

// Download as encrypted JSON
const blob = new Blob([JSON.stringify(backup, null, 2)], {
  type: 'application/json'
});
```

## 📈 Performance & Scalability

- **Frontend**: Optimized React components with lazy loading
- **Crypto**: Web Workers for heavy Argon2id operations
- **Database**: Indexed queries and connection pooling
- **Caching**: Redis for session storage and rate limiting
- **CDN**: Static asset delivery for global performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for **PT Merdeka Tsingshan Indonesia**.

## 🆘 Support

For technical support or security concerns:
- Email: it-security@merdekatsingshan.com
- Internal Slack: #securevault-support
- Emergency: +62-xxx-xxx-xxxx

---

**⚠️ Security Notice**: This application handles sensitive password data. Always use HTTPS in production and follow enterprise security policies for deployment and maintenance.
