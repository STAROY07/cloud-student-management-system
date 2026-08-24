-- Migration: 006_create_exams_table.sql
-- Description: Create table for course examinations and scheduling

CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    exam_type VARCHAR(50) NOT NULL, -- 'MIDTERM', 'FINAL', 'QUIZ', 'LAB', 'PRACTICAL'
    exam_date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 120,
    room VARCHAR(50) NOT NULL,
    semester INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    instructions TEXT,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
