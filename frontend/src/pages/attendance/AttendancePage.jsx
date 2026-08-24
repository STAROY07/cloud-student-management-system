import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck,
  Calendar,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const AttendancePage = () => {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const { user, isStudent, isAdmin, isFaculty } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // enrollmentId -> 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Student mode state
  const [studentLogs, setStudentLogs] = useState([]);

  // Summary statistics tab
  const [summary, setSummary] = useState([]);
  const [viewSummary, setViewSummary] = useState(false);

  // 1. Fetch available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.getCourses();
        if (res.success) {
          setCourses(res.data.courses);
          if (!selectedCourseId && res.data.courses.length > 0) {
            setSelectedCourseId(res.data.courses[0].id);
          }
        }
      } catch (err) {
        showToast('error', 'Failed to load courses.');
      }
    };

    fetchCourses();
  }, []);

  // 2. Fetch Attendance
  const fetchAttendanceSheet = async () => {
    if (isStudent) {
      // Student viewing own attendance
      try {
        setLoading(true);
        const res = await api.getAttendance();
        if (res.success) {
          setStudentLogs(res.data.records || []);
        }
      } catch (err) {
        showToast('error', err.message || 'Failed to load attendance.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedCourseId) return;

    try {
      setLoading(true);
      const res = await api.getAttendance({
        courseId: selectedCourseId,
        date: selectedDate,
      });

      if (res.success) {
        const records = res.data.records || [];
        setRoster(records);

        // Prepopulate attendance map
        const initialMap = {};
        records.forEach((r) => {
          initialMap[r.enrollment_id] = r.attendance_status || 'PRESENT';
        });
        setAttendanceMap(initialMap);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load attendance sheet.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Course Attendance Summary
  const fetchSummary = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const res = await api.getCourseAttendanceSummary(selectedCourseId);
      if (res.success) {
        setSummary(res.data.summary || []);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load course attendance summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewSummary) {
      fetchSummary();
    } else {
      fetchAttendanceSheet();
    }
  }, [selectedCourseId, selectedDate, isStudent, viewSummary]);

  const handleStatusChange = (enrollmentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [enrollmentId]: status,
    }));
  };

  const handleMarkAll = (status) => {
    const newMap = {};
    roster.forEach((r) => {
      newMap[r.enrollment_id] = status;
    });
    setAttendanceMap(newMap);
  };

  const handleSaveAttendance = async () => {
    const records = Object.entries(attendanceMap).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
    }));

    if (records.length === 0) return;

    try {
      setSaveLoading(true);
      await api.recordAttendance({
        courseId: selectedCourseId,
        date: selectedDate,
        records,
      });

      showToast('success', `Attendance saved successfully for ${selectedDate}.`);
      fetchAttendanceSheet();
    } catch (err) {
      showToast('error', err.message || 'Failed to save attendance.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Render for Student role
  if (isStudent) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>My Attendance Record</h1>
            <p>Verified daily attendance logs across your enrolled semester courses</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Attendance History Logs</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Loading your attendance records...</span>
              </div>
            ) : studentLogs.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No attendance records"
                description="No attendance entries have been logged yet for your courses."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '110px' }}>Date</th>
                    <th style={{ width: '15%', minWidth: '100px' }}>Course Code</th>
                    <th style={{ width: '35%', minWidth: '200px' }}>Course Title</th>
                    <th style={{ width: '15%', minWidth: '100px' }}>Status</th>
                    <th style={{ width: '20%', minWidth: '150px' }}>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {studentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{log.date}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-info">{log.course_code}</span></td>
                      <td style={{ fontWeight: 500, color: '#0f172a' }}>{log.course_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={log.status} /></td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{log.marked_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render for Admin and Faculty roles
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Daily Attendance Management</h1>
          <p>Record and update student classroom attendance with real-time database sync</p>
        </div>
        <div className="page-actions">
          <button
            className={`btn ${viewSummary ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewSummary(!viewSummary)}
          >
            <BarChart2 size={16} />
            <span>{viewSummary ? 'Switch to Daily Grid' : 'View Course Summary'}</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Selectors */}
      <div className="toolbar">
        <div className="filter-group">
          <div style={{ minWidth: 260, flex: '1 1 260px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
              Academic Course
            </label>
            <select
              className="form-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name} ({c.department})
                </option>
              ))}
            </select>
          </div>

          {!viewSummary && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                Class Date
              </label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: 170 }}
              />
            </div>
          )}
        </div>

        {!viewSummary && roster.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => handleMarkAll('PRESENT')}>
              Mark All Present
            </button>
            <button className="btn btn-primary" onClick={handleSaveAttendance} disabled={saveLoading}>
              {saveLoading ? <Spinner size="sm" white /> : (
                <>
                  <Save size={16} />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* View 1: Daily Attendance Grid */}
      {!viewSummary && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Attendance Sheet for {selectedDate} ({roster.length} Enrolled Students)</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Loading class roster and attendance status...</span>
              </div>
            ) : roster.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No enrolled students"
                description="No active students are enrolled in this course."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '14%', minWidth: '110px' }}>Roll No</th>
                    <th style={{ width: '22%', minWidth: '150px' }}>Student Name</th>
                    <th style={{ width: '24%', minWidth: '180px' }}>Email</th>
                    <th style={{ width: '16%', minWidth: '110px' }}>Current Status</th>
                    <th style={{ width: '24%', minWidth: '260px', textAlign: 'center' }}>Mark Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((stu) => {
                    const currentStatus = attendanceMap[stu.enrollment_id] || 'PRESENT';

                    return (
                      <tr key={stu.enrollment_id}>
                        <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: '#2563eb' }}>{stu.roll_no}</strong></td>
                        <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{stu.student_name}</td>
                        <td style={{ color: '#64748b' }}>{stu.student_email}</td>
                        <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={currentStatus} /></td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: 6 }}>
                            {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(stu.enrollment_id, status)}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  border: 'none',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  background: currentStatus === status
                                    ? status === 'PRESENT' ? '#059669' : status === 'ABSENT' ? '#dc2626' : status === 'LATE' ? '#d97706' : '#2563eb'
                                    : 'transparent',
                                  color: currentStatus === status ? '#ffffff' : '#64748b',
                                  transition: 'all 0.1s ease',
                                }}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
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

      {/* View 2: Aggregated Course Attendance Summary */}
      {viewSummary && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Course Attendance Aggregate Summary</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Computing course attendance percentages...</span>
              </div>
            ) : summary.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No attendance summary available"
                description="No attendance data has been logged for this course yet."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '110px' }}>Roll No</th>
                    <th style={{ width: '25%', minWidth: '160px' }}>Student Name</th>
                    <th style={{ width: '15%', minWidth: '100px' }}>Attended</th>
                    <th style={{ width: '15%', minWidth: '100px' }}>Total Classes</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Attendance %</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s) => (
                    <tr key={s.enrollment_id}>
                      <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: '#2563eb' }}>{s.roll_no}</strong></td>
                      <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{s.student_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.attended_classes}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.total_classes}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontWeight: 700,
                          color: s.percentage >= 75 ? '#059669' : '#dc2626',
                        }}>
                          {s.percentage}%
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {s.percentage >= 75 ? (
                          <span className="badge badge-success">Good Standing</span>
                        ) : (
                          <span className="badge badge-danger">Shortage Warning</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
