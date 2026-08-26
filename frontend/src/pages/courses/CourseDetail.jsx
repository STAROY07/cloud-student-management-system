import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  Users,
  ArrowLeft,
  GraduationCap,
  CalendarCheck,
  Award,
  Plus,
  Trash2,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const CourseDetail = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enroll Student Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [enrollLoading, setEnrollLoading] = useState(false);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await api.getCourseById(id);
      if (res.success) {
        setCourseData(res.data);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const res = await api.getStudents({ limit: 100 });
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to load the student directory.');
      }
      setAvailableStudents(res.data.students);
    } catch (err) {
      // Enrollment can still be retried, so this stays non-fatal but visible
      console.error('[CourseDetail] Failed to load available students:', err);
      showToast('error', err.message || 'Failed to load the student directory.');
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  useEffect(() => {
    if (isAdmin) {
      fetchAvailableStudents();
    }
  }, [isAdmin]);

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    try {
      setEnrollLoading(true);
      await api.createEnrollment({
        studentId: selectedStudentId,
        courseId: id,
        academicYear,
      });

      showToast('success', 'Student enrolled into course successfully.');
      setIsEnrollModalOpen(false);
      setSelectedStudentId('');
      fetchCourse();
    } catch (err) {
      showToast('error', err.message || 'Failed to enroll student.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDropEnrollment = async (enrollmentId, studentName) => {
    if (!window.confirm(`Drop ${studentName} from this course?`)) return;

    try {
      await api.deleteEnrollment(enrollmentId);
      showToast('success', `Student dropped from course.`);
      fetchCourse();
    } catch (err) {
      showToast('error', err.message || 'Failed to drop enrollment.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner />
        <span>Loading course syllabus and enrolled roster...</span>
      </div>
    );
  }

  if (!courseData?.course) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Course not found</h3>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>The requested course could not be loaded.</p>
        <Link to="/courses" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>
    );
  }

  const { course, roster } = courseData;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} />
          <span>Back to Course Catalog</span>
        </Link>
      </div>

      {/* Course Header Banner */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>{course.code}</span>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>{course.name}</h1>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {course.department} • Semester {course.semester} • <strong>{course.credits} Credits</strong>
              {course.faculty_name && (
                <> • Instructor: <strong>{course.faculty_name}</strong> ({course.designation})</>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to={`/attendance?courseId=${course.id}`} className="btn btn-secondary btn-sm">
              <CalendarCheck size={14} />
              <span>Attendance Sheet</span>
            </Link>
            <Link to={`/marks?courseId=${course.id}`} className="btn btn-secondary btn-sm">
              <Award size={14} />
              <span>Marks Gradebook</span>
            </Link>
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsEnrollModalOpen(true)}>
                <Plus size={14} />
                <span>Enroll Student</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enrolled Roster */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Enrolled Student Roster ({roster?.length || 0})</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {roster.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              No students currently enrolled in this course for the active semester.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Academic Year</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {roster.map((stu) => (
                  <tr key={stu.enrollment_id}>
                    <td><strong style={{ color: '#2563eb' }}>{stu.roll_no}</strong></td>
                    <td style={{ fontWeight: 600 }}>{stu.student_name}</td>
                    <td style={{ color: '#64748b' }}>{stu.student_email}</td>
                    <td>{stu.student_department}</td>
                    <td>Semester {stu.student_semester}</td>
                    <td>{stu.academic_year}</td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          title="Drop student"
                          onClick={() => handleDropEnrollment(stu.enrollment_id, stu.student_name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Enroll Student in ${course.code}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleEnrollStudent} disabled={enrollLoading || !selectedStudentId}>
              {enrollLoading ? <Spinner size="sm" white /> : 'Enroll'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEnrollStudent}>
          <div className="form-group">
            <label className="form-label">Select Student *</label>
            <select
              className="form-select"
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">-- Choose Student --</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.roll_no} - {s.name} ({s.department} Sem {s.semester})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Academic Year *</label>
            <input
              type="text"
              className="form-input"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2024-2025"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
