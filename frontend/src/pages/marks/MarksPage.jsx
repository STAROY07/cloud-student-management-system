import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  Save,
  BarChart2,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/EmptyState';

const ASSESSMENT_OPTIONS = [
  'Midterm Exam 1',
  'Cloud Architecture Assignment',
  'Midterm Exam 2',
  'Final Practical Project',
  'Quiz 1',
  'Laboratory Exam',
];

export const MarksPage = () => {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const { isStudent } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [assessment, setAssessment] = useState(ASSESSMENT_OPTIONS[0]);
  const [maxScore, setMaxScore] = useState(50);

  const [roster, setRoster] = useState([]);
  const [scoresMap, setScoresMap] = useState({}); // enrollmentId -> score
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Student mode state
  const [studentMarks, setStudentMarks] = useState([]);

  // Stats tab
  const [stats, setStats] = useState([]);
  const [viewStats, setViewStats] = useState(false);

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

  const fetchMarksRoster = async () => {
    if (isStudent) {
      try {
        setLoading(true);
        const res = await api.getMarks();
        if (res.success) {
          setStudentMarks(res.data.marks || []);
        }
      } catch (err) {
        showToast('error', err.message || 'Failed to fetch marks.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedCourseId) return;

    try {
      setLoading(true);
      const res = await api.getMarks({
        courseId: selectedCourseId,
        assessment,
      });

      if (res.success) {
        const records = res.data.records || [];
        setRoster(records);

        const initialScores = {};
        records.forEach((r) => {
          if (r.score !== null && r.score !== undefined) {
            initialScores[r.enrollment_id] = r.score;
            if (r.max_score) setMaxScore(r.max_score);
          }
        });
        setScoresMap(initialScores);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load gradebook.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const res = await api.getCourseMarkStats(selectedCourseId);
      if (res.success) {
        setStats(res.data.assessments || []);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load assessment statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewStats) {
      fetchStats();
    } else {
      fetchMarksRoster();
    }
  }, [selectedCourseId, assessment, isStudent, viewStats]);

  const handleScoreChange = (enrollmentId, val) => {
    setScoresMap((prev) => ({
      ...prev,
      [enrollmentId]: val,
    }));
  };

  const handleSaveMarks = async () => {
    const parsedMax = parseFloat(maxScore);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      showToast('error', 'Please enter a valid positive maximum score.');
      return;
    }

    const records = [];
    for (const [enrollmentId, scoreStr] of Object.entries(scoresMap)) {
      if (scoreStr !== '' && scoreStr !== null && scoreStr !== undefined) {
        const parsed = parseFloat(scoreStr);
        if (isNaN(parsed) || parsed < 0) {
          showToast('error', 'Scores cannot be negative.');
          return;
        }
        if (parsed > parsedMax) {
          showToast('error', `A score of ${parsed} exceeds the maximum score of ${parsedMax}.`);
          return;
        }
        records.push({ enrollmentId, score: parsed });
      }
    }

    if (records.length === 0) {
      showToast('error', 'Please enter marks for at least one student.');
      return;
    }

    try {
      setSaveLoading(true);
      await api.recordMarks({
        courseId: selectedCourseId,
        assessment,
        maxScore: parsedMax,
        records,
      });

      showToast('success', `Saved marks for ${records.length} students on ${assessment}.`);
      fetchMarksRoster();
    } catch (err) {
      showToast('error', err.message || 'Failed to save marks.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Student view
  if (isStudent) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>My Academic Grades & Marks</h1>
            <p>Official assessment scores and examination results for Semester 5</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Assessment Report</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Loading grades...</span>
              </div>
            ) : studentMarks.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No marks recorded"
                description="No assessment marks have been published yet for your courses."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%', minWidth: '100px' }}>Course Code</th>
                    <th style={{ width: '28%', minWidth: '180px' }}>Course Title</th>
                    <th style={{ width: '24%', minWidth: '150px' }}>Assessment</th>
                    <th style={{ width: '14%', minWidth: '100px' }}>Score / Max</th>
                    <th style={{ width: '10%', minWidth: '90px' }}>Percentage</th>
                    <th style={{ width: '12%', minWidth: '120px' }}>Graded By</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMarks.map((m) => {
                    const pct = Math.round((m.score / m.max_score) * 100);
                    return (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-info">{m.course_code}</span></td>
                        <td style={{ fontWeight: 500, color: '#0f172a' }}>{m.course_name}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{m.assessment}</td>
                        <td style={{ whiteSpace: 'nowrap' }}><strong>{m.score}</strong> / {m.max_score}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, color: pct >= 50 ? '#059669' : '#dc2626' }}>
                            {pct}%
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{m.entered_by_name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Assessment Marks & Gradebook</h1>
        </div>
        <div className="page-actions">
          <button
            className={`btn ${viewStats ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewStats(!viewStats)}
          >
            <TrendingUp size={16} />
            <span>{viewStats ? 'Switch to Grade Entry' : 'View Course Statistics'}</span>
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-group">
          <div style={{ minWidth: 240, flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
              Academic Course
            </label>
            <select
              className="form-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code}: {c.name}</option>
              ))}
            </select>
          </div>

          {!viewStats && (
            <>
              <div style={{ minWidth: 220, flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                  Assessment
                </label>
                <select
                  className="form-select"
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                >
                  <option value="Midterm Quiz 1">Midterm Quiz 1</option>
                  <option value="Midterm Quiz 2">Midterm Quiz 2</option>
                  <option value="Lab Practical 1">Lab Practical 1</option>
                  <option value="Mid-Semester Exam">Mid-Semester Exam</option>
                  <option value="End-Semester Exam">End-Semester Exam</option>
                  <option value="Semester Project">Semester Project</option>
                </select>
              </div>

              <div style={{ width: 110 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                  Max Points
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {!viewStats && roster.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSaveMarks} disabled={saveLoading}>
              {saveLoading ? <Spinner size="sm" white /> : (
                <>
                  <Save size={16} />
                  <span>Save Marks</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {!viewStats && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Grade Roster for {assessment} (Max Points: {maxScore})</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Loading student gradebook...</span>
              </div>
            ) : roster.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No enrolled students"
                description="No active students are enrolled in this course."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '110px' }}>Roll No</th>
                    <th style={{ width: '25%', minWidth: '160px' }}>Student Name</th>
                    <th style={{ width: '25%', minWidth: '180px' }}>Email</th>
                    <th style={{ width: '15%', minWidth: '120px' }}>Current Score</th>
                    <th style={{ width: '20%', minWidth: '180px', textAlign: 'right' }}>Enter Score (Max {maxScore})</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((stu) => {
                    const currentScore = scoresMap[stu.enrollment_id] ?? '';
                    const parsed = parseFloat(currentScore);
                    const isExceeded = !isNaN(parsed) && parsed > parseFloat(maxScore);

                    return (
                      <tr key={stu.enrollment_id}>
                        <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: '#2563eb' }}>{stu.roll_no}</strong></td>
                        <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{stu.student_name}</td>
                        <td style={{ color: '#64748b' }}>{stu.student_email}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {stu.score !== null && stu.score !== undefined ? (
                            <span><strong>{stu.score}</strong> / {stu.max_score}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not entered</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxScore}
                            className={`form-input ${isExceeded ? 'error' : ''}`}
                            style={{ width: 110, textAlign: 'right', display: 'inline-block' }}
                            placeholder="Score"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(stu.enrollment_id, e.target.value)}
                          />
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

      {viewStats && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Assessment Performance & Pass Rates</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Computing course assessment metrics...</span>
              </div>
            ) : stats.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No assessment stats available"
                description="No assessment marks have been entered for this course yet."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%', minWidth: '150px' }}>Assessment</th>
                    <th style={{ width: '13%', minWidth: '95px' }}>Max Points</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Students Graded</th>
                    <th style={{ width: '12%', minWidth: '95px' }}>Class Average</th>
                    <th style={{ width: '12%', minWidth: '95px' }}>Average %</th>
                    <th style={{ width: '12%', minWidth: '95px' }}>Min / Max</th>
                    <th style={{ width: '14%', minWidth: '120px' }}>Pass Rate (≥50%)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr key={row.assessment}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{row.assessment}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.max_score}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.graded_count}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.avg_score}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontWeight: 700,
                          color: (parseFloat(row.avg_percentage) || 0) >= 50 ? '#059669' : '#dc2626',
                        }}>
                          {row.avg_percentage}%
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.min_score} / {row.max_score_achieved}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${parseFloat(row.pass_rate) >= 75 ? 'badge-success' : 'badge-warning'}`}>
                          {row.pass_rate}%
                        </span>
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
