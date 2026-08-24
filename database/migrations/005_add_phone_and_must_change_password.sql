-- Migration: Add phone and must_change_password fields
-- Description: Supports admin temporary password forced reset and student phone numbers

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

ALTER TABLE faculty 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
