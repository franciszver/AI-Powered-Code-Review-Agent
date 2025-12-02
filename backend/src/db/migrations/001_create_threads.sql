-- Migration: Create threads and comments tables
-- Version: 001
-- Description: Initial schema for code review threads

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY,
    file VARCHAR(500) NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    selected_code TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    author VARCHAR(50) NOT NULL CHECK (author IN ('user', 'ai')),
    text TEXT NOT NULL,
    diff TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_threads_file ON threads(file);
CREATE INDEX IF NOT EXISTS idx_threads_resolved ON threads(resolved);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_threads_updated_at ON threads;
CREATE TRIGGER update_threads_updated_at
    BEFORE UPDATE ON threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE threads IS 'Code review threads attached to specific code ranges';
COMMENT ON TABLE comments IS 'Comments within code review threads';
COMMENT ON COLUMN threads.file IS 'Name or path of the file being reviewed';
COMMENT ON COLUMN threads.start_line IS 'Starting line number of the code selection';
COMMENT ON COLUMN threads.end_line IS 'Ending line number of the code selection';
COMMENT ON COLUMN threads.selected_code IS 'The actual code text that was selected';
COMMENT ON COLUMN threads.resolved IS 'Whether the thread has been resolved';
COMMENT ON COLUMN comments.author IS 'Either user or ai';
COMMENT ON COLUMN comments.diff IS 'Optional diff suggestion from AI';

