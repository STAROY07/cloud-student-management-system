import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  ArrowLeft,
  Mail,
  Building,
  Calendar,
  Clock,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';

export const StudentDetail = () => {
  const { id } = useParams();
  const { showToast } = useToast();

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.getStudentById(id);
        if (res.success) {
          setStudentData(res.data);
        }
      } catch (err) {
        showToast('error', err.message || 'Failed to load student details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner />
        <span>Loading student profile & academic records...</span>
      </div>
    );
  }

  if (!studentData?.student) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Student not found</h3>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>The requested student record does not exist.</p>
        <Link to="/students" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Directory
        </Link>
      </div>
    );
  }

  const student = studentData?.student;
  const enrollments = studentData?.enrolledCourses || studentData?.enrollments || [];
  const attendance = studentData?.attendanceRecords || studentData?.attendance || [];
  const marks = studentData?.marksRecords || studentData?.marks || [];

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/students" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} />
          <span>Back to Students Directory</span>
        </Link>
      </div>

      {/* Student Profile Card Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 700,
          }}>
            {student.name.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>{student.name}</h1>
              <StatusBadge status={student.status} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <strong style={{ color: '#2563eb' }}>{student.roll_no}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} /> {student.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building size={14} /> {student.department} • Semester {student.semester}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} /> Admitted {student.admission_year}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          padding: '0 1.5rem',
          borderTop: '1px solid var(--border-light)',
          background: '#f8fafc',
        }}>
          <button
            onClick={() => setActiveTab('courses')}
            style={{
              padding: '0.85rem 0',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === 'courses' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'courses' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Enrolled Courses ({enrollments?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '0.85rem 0',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === 'attendance' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'attendance' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Attendance Logs ({attendance?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('marks')}
            style={{
              padding: '0.85rem 0',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === 'marks' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'marks' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Marks & Grades ({marks?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab 1: Enrolled Courses */}
      {activeTab === 'courses' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Enrolled Academic Courses</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {(!enrollments || enrollments.length === 0) ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No active course enrollments found.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '100px' }}>Course Code</th>
                    <th style={{ width: '35%', minWidth: '180px' }}>Course Name</th>
                    <th style={{ width: '12%', minWidth: '95px' }}>Credits</th>
                    <th style={{ width: '18%', minWidth: '140px' }}>Faculty Lead</th>
                    <th style={{ width: '10%', minWidth: '95px' }}>Academic Year</th>
                    <th style={{ width: '10%', minWidth: '85px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.enrollment_id || e.id || e.course_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="badge badge-info">{e.course_code || e.code || 'CS500'}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{e.course_name || e.name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{e.credits} Credits</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{e.faculty_name || 'Unassigned'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{e.academic_year || '2024-2025'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <StatusBadge status={e.enrollment_status || e.status || 'ACTIVE'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Logs */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Attendance History</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {(!attendance || attendance.length === 0) ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No attendance records logged for this student.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%', minWidth: '110px' }}>Date</th>
                    <th style={{ width: '42%', minWidth: '180px' }}>Course</th>
                    <th style={{ width: '18%', minWidth: '100px' }}>Status</th>
                    <th style={{ width: '22%', minWidth: '110px' }}>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.date}</td>
                      <td style={{ color: '#0f172a' }}>{a.course_code ? `${a.course_code}: ` : ''}{a.course_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={a.status} /></td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Marks & Grades */}
      {activeTab === 'marks' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Assessment Marks & Scores</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {(!marks || marks.length === 0) ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                No assessment marks recorded yet.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%', minWidth: '140px' }}>Course</th>
                    <th style={{ width: '28%', minWidth: '140px' }}>Assessment</th>
                    <th style={{ width: '16%', minWidth: '90px' }}>Score</th>
                    <th style={{ width: '14%', minWidth: '90px' }}>Percentage</th>
                    <th style={{ width: '14%', minWidth: '100px' }}>Graded Date</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((m) => {
                    const pct = Math.round((m.score / m.max_score) * 100);
                    return (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="badge badge-info">{m.course_code}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{m.assessment}</td>
                        <td style={{ whiteSpace: 'nowrap' }}><strong>{m.score}</strong> / {m.max_score}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: pct >= 50 ? '#059669' : '#dc2626' }}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
