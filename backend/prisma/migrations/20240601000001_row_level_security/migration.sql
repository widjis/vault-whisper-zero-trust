-- Row Level Security (RLS) policies implementation
-- Migration: Row Level Security v2.0

-- Create application roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated_users') THEN
        CREATE ROLE authenticated_users;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vault_app') THEN
        CREATE ROLE vault_app WITH LOGIN PASSWORD 'secure_password_change_me';
    END IF;
END
$$;

-- Enable Row Level Security on tables
ALTER TABLE "vault_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_verification_tokens" ENABLE ROW LEVEL SECURITY;

-- Create a function to set the current user ID in the session
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Create policies for vault_entries
DROP POLICY IF EXISTS vault_entries_user_policy ON "vault_entries";
CREATE POLICY vault_entries_user_policy ON "vault_entries"
    FOR ALL
    USING ("user_id"::TEXT = current_setting('app.current_user_id', TRUE));

-- Policies for user_sessions
DROP POLICY IF EXISTS user_sessions_user_policy ON "user_sessions";
CREATE POLICY user_sessions_user_policy ON "user_sessions"
    FOR ALL
    USING ("user_id"::TEXT = current_setting('app.current_user_id', TRUE));

-- Policies for password_reset_tokens
DROP POLICY IF EXISTS password_reset_tokens_user_policy ON "password_reset_tokens";
CREATE POLICY password_reset_tokens_user_policy ON "password_reset_tokens"
    FOR ALL
    USING ("user_id"::TEXT = current_setting('app.current_user_id', TRUE));

-- Policies for email_verification_tokens
DROP POLICY IF EXISTS email_verification_tokens_user_policy ON "email_verification_tokens";
CREATE POLICY email_verification_tokens_user_policy ON "email_verification_tokens"
    FOR ALL
    USING ("user_id"::TEXT = current_setting('app.current_user_id', TRUE));

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated_users;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated_users;

-- Grant role to application
GRANT authenticated_users TO vault_app;

-- Create a function to initialize RLS for a new connection
CREATE OR REPLACE FUNCTION initialize_rls()
RETURNS VOID AS $$
BEGIN
    -- Set default value for app.current_user_id to avoid errors when not set
    PERFORM set_config('app.current_user_id', 'not-authenticated', FALSE);
    
    -- You can add more initialization here if needed
    RAISE NOTICE 'Row Level Security initialized';
END;
$$ LANGUAGE plpgsql;