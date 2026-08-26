import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  FileText,
  BookOpen,
  Info,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';

export const ExamSchedulePage = () => {
  const { user, isAdmin, isFaculty, isStudent } = useAuth();
  const { showToast } = useToast();

  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    examType: 'MIDTERM',
    examDate: '',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    durationMinutes: 120,
    room: '',
    semester: 5,
    academicYear: '2024-2025',
    instructions: '',
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.getExams({
        courseId: courseFilter || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      if (res.success && res.data?.exams) {
        setExams(res.data.exams);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load exam schedule.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.getCourses();
      if (!res.success || !res.data?.courses) {
        throw new Error(res.error?.message || 'Failed to load the course list.');
      }
      setCourses(res.data.courses);
      if (res.data.courses.length > 0 && !formData.courseId) {
        setFormData((prev) => ({ ...prev, courseId: res.data.courses[0].id }));
      }
    } catch (err) {
      // The schedule still renders without the course picker, but report it
      console.error('[ExamSchedule] Failed to load courses:', err);
      showToast('error', err.message || 'Failed to load the course list.');
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [statusFilter, courseFilter]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!formData.courseId) {
      showToast('error', 'Please select a course.');
      return;
    }
    if (!formData.title.trim()) {
      showToast('error', 'Exam title is required.');
      return;
    }
    if (!formData.examDate) {
      showToast('error', 'Exam date is required.');
      return;
    }
    if (!formData.room.trim()) {
      showToast('error', 'Room / Venue is required.');
      return;
    }

    try {
      setModalLoading(true);
      const res = await api.createExam({
        ...formData,
        durationMinutes: parseInt(formData.durationMinutes, 10) || 120,
        semester: parseInt(formData.semester, 10) || 5,
      });

      if (res.success) {
        showToast('success', res.message || 'Exam scheduled successfully.');
        setIsModalOpen(false);
        setFormData({
          courseId: courses[0]?.id || '',
          title: '',
          examType: 'MIDTERM',
          examDate: '',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          durationMinutes: 120,
          room: '',
          semester: 5,
          academicYear: '2024-2025',
          instructions: '',
        });
        fetchExams();
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to schedule exam.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCancelExam = async (id, title) => {
    if (!window.confirm(`Are you sure you want to cancel the examination "${title}"?`)) return;
    try {
      await api.deleteExam(id);
      showToast('success', 'Examination marked as CANCELLED.');
      fetchExams();
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel exam.');
    }
  };

  const filteredExams = exams.filter((ex) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        ex.title?.toLowerCase().includes(q) ||
        ex.course_code?.toLowerCase().includes(q) ||
        ex.course_name?.toLowerCase().includes(q) ||
        ex.room?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getDaysDiff = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1) return `In ${diff} days`;
    return 'Past date';
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Examination Schedule</h1>
          <p>Official university timetable, venues, and semester 5 examination guidelines</p>
        </div>
        <div className="page-actions">
          {(isAdmin || isFaculty) && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>Schedule Examination</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="toolbar">
        <div className="search-input-group">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by title, course, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="form-select"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            style={{ width: 220 }}
          >
            <option value="">All Academic Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 140 }}
          >
            <option value="ALL">All Status</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button className="btn btn-secondary" onClick={fetchExams} title="Refresh schedule">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-container">
          <Spinner />
          <span>Loading official examination schedule...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Examinations Scheduled"
          description={
            isStudent
              ? 'No upcoming examinations found for your enrolled academic courses.'
              : 'No examination records match your filter criteria.'
          }
        />
      ) : (
        <div className="exam-grid">
          {filteredExams.map((ex) => {
            const daysTag = getDaysDiff(ex.exam_date);
            const isCancelled = ex.status === 'CANCELLED';

            return (
              <div
                key={ex.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: isCancelled ? '4px solid #ef4444' : '4px solid #2563eb',
                  opacity: isCancelled ? 0.75 : 1,
                }}
              >
                <div className="card-body">
                  {/* Card Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-info">{ex.course_code}</span>
                      <span className="badge badge-neutral">{ex.exam_type}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        background: isCancelled ? '#fee2e2' : '#f0fdf4',
                        color: isCancelled ? '#991b1b' : '#166534',
                      }}
                    >
                      {isCancelled ? 'CANCELLED' : daysTag}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' }}>
                    {ex.title}
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0 0 1rem', fontWeight: 500 }}>
                    {ex.course_name}
                  </p>

                  {/* Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem', color: '#475569', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={15} color="#2563eb" />
                      <span>{ex.exam_date}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={15} color="#2563eb" />
                      <span>{ex.start_time} – {ex.end_time}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={15} color="#2563eb" />
                      <span><strong>{ex.room}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileText size={15} color="#2563eb" />
                      <span>{ex.duration_minutes} Minutes</span>
                    </div>
                  </div>

                  {/* Instructions / Notes */}
                  {ex.instructions && (
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.775rem',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.4rem',
                    }}>
                      <Info size={14} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{ex.instructions}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer with Faculty / Admin Actions */}
                {(isAdmin || isFaculty) && !isCancelled && (
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    background: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                  }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancelExam(ex.id, ex.title)}
                      title="Cancel examination"
                    >
                      <Trash2 size={13} />
                      <span>Cancel Exam</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule New Examination</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateExam}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Academic Course *</label>
                  <select
                    className="form-select"
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    required
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}: {c.name} ({c.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Exam Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Midterm Examination"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Exam Type *</label>
                    <select
                      className="form-select"
                      value={formData.examType}
                      onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    >
                      <option value="MIDTERM">MIDTERM</option>
                      <option value="FINAL">FINAL</option>
                      <option value="QUIZ">QUIZ</option>
                      <option value="LAB">LAB</option>
                      <option value="PRACTICAL">PRACTICAL</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Exam Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={formData.examDate}
                      onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Room / Venue *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Hall A-204, Lab B-301"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="10:00 AM"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="12:00 PM"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Instructions / Guidelines (Optional)</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Allowed items, calculators, ID requirements, etc."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? <Spinner size="sm" white /> : 'Publish Examination Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
