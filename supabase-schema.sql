-- HushKey Database Schema for Supabase
-- Run this SQL in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (managed by Supabase Auth, but we add profile data)
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- User profiles for additional encryption metadata
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT, -- For secure sharing (optional)
    private_key_encrypted TEXT, -- Encrypted with master key (optional)
    salt TEXT NOT NULL, -- Salt used in key derivation (stored separately for better security)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vaults table
CREATE TABLE IF NOT EXISTS public.vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('login', 'note', 'card', 'totp')),
    data_encrypted TEXT NOT NULL, -- Contains all item data (URL, username, password, etc.)
    folder_id UUID, -- For organizing items within vaults (optional)
    tags TEXT[], -- Array of tags for filtering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item history for versioning
CREATE TABLE IF NOT EXISTS public.item_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    data_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Folders within vaults
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE, -- For nested folders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devices table for session management
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT,
    device_id TEXT NOT NULL UNIQUE, -- Client-generated unique identifier
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared vaults (for collaboration features - Phase 4)
CREATE TABLE IF NOT EXISTS public.shared_vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permissions TEXT NOT NULL CHECK (permissions IN ('read', 'write', 'admin')),
    shared_key_encrypted TEXT, -- Encrypted key for accessing the vault
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs for shared vaults
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_vault_id UUID REFERENCES public.shared_vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'share', etc.
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    details TEXT, -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File attachments (for encrypted files - future feature)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    file_name_encrypted TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    file_path TEXT, -- Supabase Storage path
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency access requests (future feature)
CREATE TABLE IF NOT EXISTS public.emergency_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trusted_contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    waiting_period_days INTEGER DEFAULT 7,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
    request_granted_at TIMESTAMP WITH TIME ZONE,
    accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for vaults
CREATE POLICY "Users can view their own vaults" ON public.vaults
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vaults" ON public.vaults
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vaults" ON public.vaults
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vaults" ON public.vaults
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for items (vaults are encrypted, so we rely on vault ownership)
CREATE POLICY "Users can view items in their vaults" ON public.items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vaults
            WHERE vaults.id = items.vault_id
            AND vaults.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create items in their vaults" ON public.items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vaults
            WHERE vaults.id = items.vault_id
            AND vaults.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their vaults" ON public.items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.vaults
            WHERE vaults.id = items.vault_id
            AND vaults.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their vaults" ON public.items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.vaults
            WHERE vaults.id = items.vault_id
            AND vaults.user_id = auth.uid()
        )
    );

-- Similar RLS policies for shared vaults (Phase 4)
-- For now, only basic policies are implemented

-- RLS Policies for devices
CREATE POLICY "Users can view their own devices" ON public.devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own devices" ON public.devices
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS vaults_user_id_idx ON public.vaults(user_id);
CREATE INDEX IF NOT EXISTS items_vault_id_idx ON public.items(vault_id);
CREATE INDEX IF NOT EXISTS folders_vault_id_idx ON public.folders(vault_id);
CREATE INDEX IF NOT EXISTS devices_user_id_idx ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS shared_vaults_vault_id_idx ON public.shared_vaults(vault_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vaults_updated_at BEFORE UPDATE ON public.vaults
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
