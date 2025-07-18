-- Enhanced database schema with audit logging and performance optimizations
-- Version: 2.0
-- Date: 2024-01-01

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with enhanced security
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret TEXT,
    backup_codes TEXT[],
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT password_hash_length CHECK (length(password_hash) >= 60),
    CONSTRAINT salt_length CHECK (length(salt) >= 16)
);

-- Vault entries table with enhanced metadata
CREATE TABLE IF NOT EXISTS vault_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    encrypted_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    tags TEXT[],
    category VARCHAR(100),
    favorite BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT encrypted_data_structure CHECK (
        encrypted_data ? 'iv' AND 
        encrypted_data ? 'ciphertext' AND 
        encrypted_data ? 'tag'
    )
);

-- User sessions table for token management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    revoked BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT token_hash_length CHECK (length(token_hash) >= 32),
    CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);

-- Audit log table for security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT action_not_empty CHECK (length(trim(action)) > 0)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT token_hash_length CHECK (length(token_hash) >= 32),
    CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT token_hash_length CHECK (length(token_hash) >= 32),
    CONSTRAINT expires_in_future CHECK (expires_at > created_at)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

CREATE INDEX IF NOT EXISTS idx_vault_entries_user_id ON vault_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_entries_created_at ON vault_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_entries_updated_at ON vault_entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_vault_entries_title ON vault_entries(title);
CREATE INDEX IF NOT EXISTS idx_vault_entries_category ON vault_entries(category);
CREATE INDEX IF NOT EXISTS idx_vault_entries_tags ON vault_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_vault_entries_favorite ON vault_entries(favorite) WHERE favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked) WHERE revoked = FALSE;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_entries_updated_at 
    BEFORE UPDATE ON vault_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up expired sessions
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean up expired email verification tokens
    DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, details,
        ip_address, user_agent, success, error_message
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id, p_details,
        p_ip_address, p_user_agent, p_success, p_error_message
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_login,
    COUNT(ve.id) as entry_count,
    COUNT(CASE WHEN ve.favorite THEN 1 END) as favorite_count,
    MAX(ve.accessed_at) as last_entry_access
FROM users u
LEFT JOIN vault_entries ve ON u.id = ve.user_id
GROUP BY u.id, u.email, u.created_at, u.last_login;

CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    al.id,
    al.user_id,
    u.email,
    al.action,
    al.resource_type,
    al.resource_id,
    al.success,
    al.created_at,
    al.ip_address
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY al.created_at DESC;

-- Row Level Security (RLS) policies
ALTER TABLE vault_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for vault_entries
CREATE POLICY vault_entries_user_policy ON vault_entries
    FOR ALL TO authenticated_users
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policies for user_sessions
CREATE POLICY user_sessions_user_policy ON user_sessions
    FOR ALL TO authenticated_users
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated_users;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated_users;

-- Create role for the application
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vault_app') THEN
        CREATE ROLE vault_app WITH LOGIN PASSWORD 'your_secure_password_here';
    END IF;
END
$$;

GRANT authenticated_users TO vault_app;