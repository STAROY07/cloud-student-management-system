import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  Award,
  BarChart2,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  FileText,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { RoleBadge, StatusBadge } from '../../components/common/Badge';

export const Dashboard = () => {
  const { user, isAdmin, isFaculty, isStudent } = useAuth();
  const [data, setData] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.getDashboard();
        if (res.success) {
          setData(res.data);
        }

        // Fetch upcoming exams for role
        const exRes = await api.getUpcomingExams().catch(() => ({ data: { upcomingExams: [] } }));
        if (exRes?.data?.upcomingExams) {
          setUpcomingExams(exRes.data.upcomingExams);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="loading-container">
        <Spinner />
        <span>Loading live database metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fecaca' }}>
        <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#991b1b' }}>Failed to Load Dashboard</h3>
        <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p>
            Welcome back, <strong>{user?.name}</strong> • Real-time database metrics for Semester 5
          </p>
        </div>
      </div>

      {/* 1. ADMIN DASHBOARD */}
      {isAdmin && data?.kpis && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-box indigo">
                <GraduationCap size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Total Students</div>
                <div className="kpi-value">{data.kpis.totalStudents}</div>
                <div className="kpi-subtext">Active enrollments across depts</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box emerald">
                <Users size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Faculty Staff</div>
                <div className="kpi-value">{data.kpis.totalFaculty}</div>
                <div className="kpi-subtext">Teaching professors & leads</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box violet">
                <BookOpen size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Active Courses</div>
                <div className="kpi-value">{data.kpis.totalCourses}</div>
                <div className="kpi-subtext">{data.kpis.totalEnrollments} student enrollments</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box amber">
                <CalendarCheck size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Attendance Rate</div>
                <div className="kpi-value">{data.kpis.avgAttendanceRate}%</div>
                <div className="kpi-subtext">University-wide average</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Department Distribution */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Department Distribution</h2>
                <BarChart2 size={16} color="#64748b" />
              </div>
              <div className="card-body">
                {data.departments?.map((dept) => {
                  const pct = Math.round((dept.count / data.kpis.totalStudents) * 100) || 0;
                  return (
                    <div key={dept.department} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600 }}>{dept.department}</span>
                        <span style={{ color: '#64748b' }}>{dept.count} students ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: 999 }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Audit Activities */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Recent Administrative Activity</h2>
                <Link to="/audit-logs" style={{ fontSize: '0.825rem' }}>View full audit ↗</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Actor</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAuditLogs?.map((log) => (
                      <tr key={log.id}>
                        <td><code>{log.action}</code></td>
                        <td><span className="badge badge-neutral">{log.entity}</span></td>
                        <td>{log.actor_name}</td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. FACULTY DASHBOARD */}
      {isFaculty && data?.kpis && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-box violet">
                <BookOpen size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Assigned Courses</div>
                <div className="kpi-value">{data.kpis.assignedCoursesCount}</div>
                <div className="kpi-subtext">Teaching portfolio</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box emerald">
                <Users size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Enrolled Students</div>
                <div className="kpi-value">{data.kpis.totalStudentsInCourses}</div>
                <div className="kpi-subtext">Across your active batches</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">My Assigned Courses</h2>
              </div>
              <div className="card-body">
                {data.courses?.map((c) => (
                  <div key={c.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="badge badge-info">{c.code}</span>
                        <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {c.department} • {c.credits} Credits • {c.enrollment_count} Students
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/attendance?courseId=${c.id}`} className="btn btn-secondary btn-sm">
                        Attendance
                      </Link>
                      <Link to={`/marks?courseId=${c.id}`} className="btn btn-secondary btn-sm">
                        Marks
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Faculty Upcoming Exams */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Upcoming Scheduled Exams</h2>
                <Link to="/exams" style={{ fontSize: '0.825rem' }}>Manage Exams →</Link>
              </div>
              <div className="card-body">
                {upcomingExams.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    No upcoming exams scheduled.
                  </div>
                ) : (
                  upcomingExams.slice(0, 3).map((ex) => (
                    <div key={ex.id} style={{
                      padding: '0.85rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      marginBottom: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{ex.title}</strong>
                        <span className="badge badge-info">{ex.exam_type}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <span>📚 {ex.course_code}</span>
                        <span>📅 {ex.exam_date} ({ex.start_time} - {ex.end_time})</span>
                        <span>📍 {ex.room}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. STUDENT DASHBOARD */}
      {isStudent && data?.kpis && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon-box indigo">
                <BookOpen size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Enrolled Courses</div>
                <div className="kpi-value">{data.kpis.enrolledCoursesCount}</div>
                <div className="kpi-subtext">Active semester courses</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon-box emerald">
                <CalendarCheck size={24} />
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Overall Attendance</div>
                <div className="kpi-value">{data.kpis.totalClasses > 0 ? `${data.kpis.overallAttendance}%` : 'N/A'}</div>
                <div className="kpi-subtext">
                  {data.kpis.totalClasses > 0
                    ? `${data.kpis.attendedClasses} of ${data.kpis.totalClasses} classes attended`
                    : 'No attendance records logged yet'}
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Exam Notification Card for Students */}
          {upcomingExams.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Next Upcoming Examination
                        </span>
                        <span className="badge badge-info">{upcomingExams[0].exam_type}</span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem' }}>
                        {upcomingExams[0].course_code}: {upcomingExams[0].title}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.825rem', color: '#475569' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={14} color="#2563eb" /> {upcomingExams[0].exam_date} • {upcomingExams[0].start_time} – {upcomingExams[0].end_time} ({upcomingExams[0].duration_minutes} mins)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={14} color="#2563eb" /> Room {upcomingExams[0].room}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link to="/exams" className="btn btn-primary btn-sm" style={{ alignSelf: 'center' }}>
                    View Full Schedule →
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {/* Course Attendance Breakdown */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Course Attendance Breakdown</h2>
              </div>
              <div className="card-body">
                {(!data.courseAttendance || data.courseAttendance.length === 0) ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    No course attendance records logged yet.
                  </div>
                ) : (
                  data.courseAttendance.map((ca) => (
                    <div key={ca.course_code} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600 }}>{ca.course_code}: {ca.course_name}</span>
                        <span style={{ fontWeight: 600, color: ca.percentage >= 75 ? '#059669' : '#dc2626' }}>
                          {ca.total_classes > 0 ? `${ca.percentage}% (${ca.attended_classes}/${ca.total_classes})` : 'No logs'}
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          width: `${ca.total_classes > 0 ? ca.percentage : 0}%`,
                          height: '100%',
                          background: ca.percentage >= 75 ? '#059669' : '#dc2626',
                          borderRadius: 999
                        }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Marks */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Recent Grades & Marks</h2>
                <Link to="/marks" style={{ fontSize: '0.825rem' }}>View All →</Link>
              </div>
              <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                {(!data.marks || data.marks.length === 0) ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    No assessment marks published yet.
                  </div>
                ) : (
                  <table className="data-table" style={{ width: '100%', minWidth: '380px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>Course</th>
                        <th>Assessment</th>
                        <th style={{ textAlign: 'right', paddingRight: '1.25rem', width: '90px' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.marks.map((m) => (
                        <tr key={m.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span className="badge badge-info">{m.course_code}</span>
                          </td>
                          <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>{m.assessment}</td>
                          <td style={{ textAlign: 'right', paddingRight: '1.25rem', whiteSpace: 'nowrap' }}>
                            <strong style={{ color: '#0f172a' }}>{m.score}</strong>{' '}
                            <span style={{ color: '#94a3b8', fontSize: '0.775rem' }}>/ {m.max_score}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
