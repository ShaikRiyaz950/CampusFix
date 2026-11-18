-- Run this once in your Supabase Dashboard -> SQL Editor to enable cloud sync from CampusFix

CREATE TABLE IF NOT EXISTS public.complaints (
    id BIGINT PRIMARY KEY,
    tracking_id TEXT UNIQUE,
    user_id BIGINT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Pending',
    assigned_to TEXT,
    ai_summary TEXT,
    image_url TEXT,
    rating INTEGER,
    feedback_comment TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sb_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_sb_complaints_category ON public.complaints(category);
