import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Filter,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
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
  const [remarksMap, setRemarksMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Student mode state
  const [studentLogs, setStudentLogs] = useState([]);
  const [studentCourseFilter, setStudentCourseFilter] = useState('ALL');

  // Summary statistics tab
  const [summaryData, setSummaryData] = useState({ totalClasses: 0, overallRate: 0, studentSummaries: [] });
  const [viewSummary, setViewSummary] = useState(false);
  const [shortageOnly, setShortageOnly] = useState(false);

  // 1. Fetch available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.getCourses();
        if (res.success && res.data.courses) {
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
      if (res.success && res.data.summary) {
        setSummaryData(res.data.summary);
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
    showToast('info', `Marked all students as ${status}`);
  };

  const handleSaveAttendance = async () => {
    const records = Object.entries(attendanceMap).map(([enrollmentId, status]) => ({
      enrollmentId,
      status,
      remarks: remarksMap[enrollmentId] || '',
    }));

    if (records.length === 0) return;

    try {
      setSaveLoading(true);
      await api.recordAttendance({
        courseId: selectedCourseId,
        date: selectedDate,
        records,
      });

      showToast('success', `Attendance successfully saved and verified for ${selectedDate}!`);
      fetchAttendanceSheet();
    } catch (err) {
      showToast('error', err.message || 'Failed to save attendance.');
    } finally {
      setSaveLoading(false);
    }
  };

  const adjustDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Filtered roster for search
  const filteredRoster = useMemo(() => {
    if (!searchTerm) return roster;
    const term = searchTerm.toLowerCase();
    return roster.filter(
      (r) =>
        r.student_name?.toLowerCase().includes(term) ||
        r.roll_no?.toLowerCase().includes(term) ||
        r.student_email?.toLowerCase().includes(term)
    );
  }, [roster, searchTerm]);

  // Live Counts for today
  const liveStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    roster.forEach((r) => {
      const st = attendanceMap[r.enrollment_id] || 'PRESENT';
      if (st === 'PRESENT') present++;
      else if (st === 'ABSENT') absent++;
      else if (st === 'LATE') late++;
      else if (st === 'EXCUSED') excused++;
    });

    const total = roster.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    return { total, present, absent, late, excused, rate };
  }, [roster, attendanceMap]);

  // Export Summary to CSV
  const handleExportCSV = () => {
    if (!summaryData.studentSummaries || summaryData.studentSummaries.length === 0) {
      showToast('warning', 'No summary data available to export.');
      return;
    }

    const headers = ['Roll No', 'Student Name', 'Email', 'Attended Classes', 'Total Classes', 'Attendance Percentage', 'Standing'];
    const rows = summaryData.studentSummaries.map((s) => [
      s.roll_no,
      `"${s.student_name}"`,
      s.student_email || '',
      s.attended_classes,
      s.total_classes,
      `${s.percentage}%`,
      s.percentage >= 75 ? 'Good Standing' : 'Shortage Warning',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StudentHub_Attendance_${selectedCourseId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Attendance summary exported to CSV.');
  };

  const selectedCourseObj = courses.find((c) => c.id === selectedCourseId);

  // ----------------------------------------------------------------
  // STUDENT VIEW
  // ----------------------------------------------------------------
  if (isStudent) {
    const studentTotal = studentLogs.length;
    const studentPresent = studentLogs.filter((l) => l.status === 'PRESENT').length;
    const overallRate = studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 100;

    const filteredStudentLogs = studentCourseFilter === 'ALL'
      ? studentLogs
      : studentLogs.filter((l) => l.course_code === studentCourseFilter || l.course_id === studentCourseFilter);

    // Subject breakdown
    const subjectWise = {};
    studentLogs.forEach((l) => {
      const code = l.course_code || 'Course';
      if (!subjectWise[code]) {
        subjectWise[code] = { code, name: l.course_name, total: 0, attended: 0 };
      }
      subjectWise[code].total++;
      if (l.status === 'PRESENT') subjectWise[code].attended++;
    });

    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>My Attendance Portal</h1>
            <p>Real-time tracked classroom attendance and semester eligibility status</p>
          </div>
        </div>

        {/* Hero Attendance Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              background: overallRate >= 75 ? '#ecfdf5' : '#fef2f2',
              color: overallRate >= 75 ? '#059669' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Overall Attendance Rate</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: overallRate >= 75 ? '#059669' : '#dc2626' }}>
                {overallRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {overallRate >= 75 ? 'Meets 75% University Requirement' : 'Below 75% Shortage Threshold'}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <UserCheck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Classes Attended</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {studentPresent} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/ {studentTotal}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Total Verified Classroom Sessions
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              background: '#f8fafc',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CalendarCheck size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Standing Status</div>
              <div style={{ marginTop: '0.35rem' }}>
                {overallRate >= 75 ? (
                  <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>Eligible for Exams</span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>Attendance Shortage</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subject-Wise Breakdown Cards */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">Subject-Wise Attendance Breakdown</h2>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', padding: '1.25rem' }}>
            {Object.values(subjectWise).map((sub) => {
              const subRate = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 100;
              return (
                <div
                  key={sub.code}
                  style={{
                    padding: '1rem',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>{sub.code}</span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', marginTop: '0.35rem' }}>{sub.name}</div>
                    </div>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: subRate >= 75 ? '#059669' : '#dc2626',
                    }}>
                      {subRate}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', margin: '0.5rem 0' }}>
                    <div style={{
                      width: `${subRate}%`,
                      height: '100%',
                      background: subRate >= 75 ? '#059669' : '#dc2626',
                      borderRadius: 999,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>{sub.attended} / {sub.total} sessions</span>
                    <span>{subRate >= 75 ? 'Eligible' : 'Shortage'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Daily Logs Table */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 className="card-title">Detailed Daily Attendance Logs</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={15} style={{ color: '#64748b' }} />
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                value={studentCourseFilter}
                onChange={(e) => setStudentCourseFilter(e.target.value)}
              >
                <option value="ALL">All Subjects</option>
                {Object.values(subjectWise).map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Loading verified attendance logs...</span>
              </div>
            ) : filteredStudentLogs.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No attendance records"
                description="No attendance entries have been recorded yet for your courses."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '110px' }}>Date</th>
                    <th style={{ width: '15%', minWidth: '100px' }}>Course Code</th>
                    <th style={{ width: '40%', minWidth: '220px' }}>Course Title</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Status</th>
                    <th style={{ width: '15%', minWidth: '140px' }}>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{log.date}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-info">{log.course_code}</span></td>
                      <td style={{ fontWeight: 500, color: '#0f172a' }}>{log.course_name}</td>
                      <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={log.status} /></td>
                      <td style={{ color: '#059669', fontSize: '0.825rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        ✓ Verified
                      </td>
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

  // ----------------------------------------------------------------
  // FACULTY & ADMIN VIEW (Full Interactive Marking Grid)
  // ----------------------------------------------------------------
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Student Attendance Management</h1>
          <p>Mark daily attendance, manage rosters, and monitor classroom engagement</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          {viewSummary && (
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
          <button
            className={`btn ${viewSummary ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewSummary(!viewSummary)}
          >
            <BarChart2 size={16} />
            <span>{viewSummary ? 'Switch to Daily Grid' : 'Course Summary & Analytics'}</span>
          </button>
        </div>
      </div>

      {/* Selector Toolbar */}
      <div className="toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', flex: 1 }}>
          {/* Course Picker */}
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

          {/* Date Picker + Navigation Controls */}
          {!viewSummary && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                Class Date
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => adjustDate(-1)}
                  title="Previous Day"
                  style={{ padding: '0.5rem 0.6rem' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: 155 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => adjustDate(1)}
                  title="Next Day"
                  style={{ padding: '0.5rem 0.6rem' }}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
                >
                  Today
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right action buttons */}
        {!viewSummary && roster.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveAttendance}
              disabled={saveLoading}
              style={{ padding: '0.55rem 1.25rem', fontWeight: 700 }}
            >
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

      {/* DAILY GRID VIEW */}
      {!viewSummary && (
        <>
          {/* Live Session Counter Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div className="card" style={{ padding: '1rem', background: '#f8fafc' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Enrolled</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{liveStats.total}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#ecfdf5', borderLeft: '4px solid #059669' }}>
              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Present</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{liveStats.present}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#fef2f2', borderLeft: '4px solid #dc2626' }}>
              <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Absent</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{liveStats.absent}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#fffbeb', borderLeft: '4px solid #d97706' }}>
              <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Late</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{liveStats.late}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#eff6ff', borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Attendance Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{liveStats.rate}%</div>
            </div>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 className="card-title">
                  Attendance Sheet — {selectedCourseObj?.code || 'Course'} ({selectedDate})
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Click status buttons to mark each student or use bulk actions
                </span>
              </div>

              {/* Roster Search & Mass-Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2rem', height: 34, fontSize: '0.825rem', width: 170 }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleMarkAll('PRESENT')}
                  style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleMarkAll('ABSENT')}
                  style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              {loading ? (
                <div className="loading-container">
                  <Spinner />
                  <span>Loading class roster and attendance status...</span>
                </div>
              ) : filteredRoster.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No enrolled students found"
                  description="No students matched your search or are enrolled in this course."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '14%', minWidth: '110px' }}>Roll No</th>
                      <th style={{ width: '22%', minWidth: '150px' }}>Student Name</th>
                      <th style={{ width: '22%', minWidth: '180px' }}>Academic Email</th>
                      <th style={{ width: '14%', minWidth: '110px' }}>Current Status</th>
                      <th style={{ width: '28%', minWidth: '280px', textAlign: 'center' }}>Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((stu) => {
                      const currentStatus = attendanceMap[stu.enrollment_id] || 'PRESENT';

                      return (
                        <tr key={stu.enrollment_id}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <strong style={{ color: '#2563eb' }}>{stu.roll_no}</strong>
                          </td>
                          <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {stu.student_name}
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            {stu.student_email}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <StatusBadge status={currentStatus} />
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{
                              display: 'inline-flex',
                              gap: '0.25rem',
                              background: '#f1f5f9',
                              padding: '0.25rem',
                              borderRadius: 8,
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                            }}>
                              {[
                                { key: 'PRESENT', label: 'Present', color: '#059669', bg: '#059669' },
                                { key: 'ABSENT', label: 'Absent', color: '#dc2626', bg: '#dc2626' },
                                { key: 'LATE', label: 'Late', color: '#d97706', bg: '#d97706' },
                                { key: 'EXCUSED', label: 'Excused', color: '#2563eb', bg: '#2563eb' },
                              ].map((option) => {
                                const isSelected = currentStatus === option.key;
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => handleStatusChange(stu.enrollment_id, option.key)}
                                    style={{
                                      padding: '0.35rem 0.75rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      border: 'none',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      background: isSelected ? option.bg : 'transparent',
                                      color: isSelected ? '#ffffff' : '#64748b',
                                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.15)' : 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
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
        </>
      )}

      {/* SUMMARY & AGGREGATE VIEW */}
      {viewSummary && (
        <>
          {/* Summary KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Lectures Conducted</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{summaryData.totalClasses}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Course Average Attendance</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{summaryData.overallRate}%</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Students with Shortage (&lt;75%)</div>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: (summaryData.studentSummaries?.filter((s) => s.percentage < 75).length || 0) > 0 ? '#dc2626' : '#059669',
              }}>
                {summaryData.studentSummaries?.filter((s) => s.percentage < 75).length || 0}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 className="card-title">Student Attendance Aggregated Performance</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Cumulative semester attendance breakdown with university standing classification
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={shortageOnly}
                    onChange={(e) => setShortageOnly(e.target.checked)}
                  />
                  <span>Show Shortage Only (&lt;75%)</span>
                </label>
              </div>
            </div>

            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              {loading ? (
                <div className="loading-container">
                  <Spinner />
                  <span>Computing course attendance percentages...</span>
                </div>
              ) : summaryData.studentSummaries?.length === 0 ? (
                <EmptyState
                  icon={BarChart2}
                  title="No attendance summary available"
                  description="No attendance data has been logged for this course yet."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '12%', minWidth: '100px' }}>Roll No</th>
                      <th style={{ width: '22%', minWidth: '150px' }}>Student Name</th>
                      <th style={{ width: '12%', minWidth: '90px' }}>Attended</th>
                      <th style={{ width: '12%', minWidth: '90px' }}>Total</th>
                      <th style={{ width: '24%', minWidth: '180px' }}>Attendance %</th>
                      <th style={{ width: '18%', minWidth: '130px' }}>Standing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.studentSummaries
                      ?.filter((s) => !shortageOnly || s.percentage < 75)
                      .map((s) => (
                        <tr key={s.student_id || s.enrollment_id}>
                          <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: '#2563eb' }}>{s.roll_no}</strong></td>
                          <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{s.student_name}</td>
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#059669' }}>{s.attended_classes}</td>
                          <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>{s.total_classes}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{
                                  width: `${s.percentage}%`,
                                  height: '100%',
                                  background: s.percentage >= 75 ? '#059669' : '#dc2626',
                                  borderRadius: 999,
                                }} />
                              </div>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.875rem',
                                color: s.percentage >= 75 ? '#059669' : '#dc2626',
                                minWidth: 42,
                              }}>
                                {s.percentage}%
                              </span>
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {s.percentage >= 75 ? (
                              <span className="badge badge-success">Good Standing</span>
                            ) : (
                              <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <AlertTriangle size={12} />
                                <span>Shortage</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
