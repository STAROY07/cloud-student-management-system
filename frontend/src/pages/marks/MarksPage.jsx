import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Download,
  PlusCircle,
  CheckCircle,
  FileText,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { EmptyState } from '../../components/common/EmptyState';

const ASSESSMENT_OPTIONS = [
  'Midterm Exam 1',
  'Midterm Exam 2',
  'Cloud Architecture Assignment',
  'Cloud Practical Laboratory',
  'Semester Project Evaluation',
  'Quiz 1',
  'Final Practical Project',
  'Final Semester Exam',
];

const computeGrade = (percentage) => {
  if (percentage >= 90) return { grade: 'A+', color: '#059669', bg: '#ecfdf5' };
  if (percentage >= 80) return { grade: 'A', color: '#059669', bg: '#ecfdf5' };
  if (percentage >= 70) return { grade: 'B', color: '#2563eb', bg: '#eff6ff' };
  if (percentage >= 60) return { grade: 'C', color: '#d97706', bg: '#fffbeb' };
  if (percentage >= 50) return { grade: 'D', color: '#ea580c', bg: '#fff7ed' };
  return { grade: 'F', color: '#dc2626', bg: '#fef2f2' };
};

export const MarksPage = () => {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const { user, isStudent } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [assessment, setAssessment] = useState(ASSESSMENT_OPTIONS[0]);
  const [customAssessment, setCustomAssessment] = useState('');
  const [isCustomAssessment, setIsCustomAssessment] = useState(false);
  const [maxScore, setMaxScore] = useState(50);

  const [roster, setRoster] = useState([]);
  const [scoresMap, setScoresMap] = useState({}); // enrollmentId -> score
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Student mode state
  const [studentMarks, setStudentMarks] = useState([]);

  // Stats tab
  const [stats, setStats] = useState([]);
  const [viewStats, setViewStats] = useState(false);

  const activeAssessmentName = isCustomAssessment ? customAssessment || 'Custom Assessment' : assessment;

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
        assessment: activeAssessmentName,
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
      if (res.success && res.data.assessments) {
        setStats(res.data.assessments);
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
  }, [selectedCourseId, activeAssessmentName, isStudent, viewStats]);

  const handleScoreChange = (enrollmentId, val) => {
    const num = val === '' ? '' : parseFloat(val);
    if (val !== '' && (isNaN(num) || num < 0 || num > maxScore)) {
      showToast('warning', `Score must be between 0 and ${maxScore}.`);
      return;
    }
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
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score < 0 || score > parsedMax) {
          showToast('error', `Invalid score detected. Scores must be between 0 and ${parsedMax}.`);
          return;
        }
        records.push({ enrollmentId, score });
      }
    }

    if (records.length === 0) {
      showToast('warning', 'Please enter scores for at least one student.');
      return;
    }

    try {
      setSaveLoading(true);
      await api.recordMarks({
        courseId: selectedCourseId,
        assessment: activeAssessmentName,
        maxScore: parsedMax,
        records,
      });

      showToast('success', `Scores successfully recorded and verified for ${activeAssessmentName}!`);
      fetchMarksRoster();
    } catch (err) {
      showToast('error', err.message || 'Failed to save marks.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Live Performance Stats
  const liveStats = useMemo(() => {
    const entered = [];
    roster.forEach((r) => {
      const val = scoresMap[r.enrollment_id];
      if (val !== '' && val !== null && val !== undefined) {
        const num = parseFloat(val);
        if (!isNaN(num)) entered.push(num);
      }
    });

    if (entered.length === 0) {
      return { count: 0, avg: 0, avgPct: 0, highest: 0, lowest: 0, passCount: 0, passPct: 0 };
    }

    const sum = entered.reduce((a, b) => a + b, 0);
    const avg = Number((sum / entered.length).toFixed(1));
    const avgPct = maxScore > 0 ? Math.round((avg / maxScore) * 100) : 0;
    const highest = Math.max(...entered);
    const lowest = Math.min(...entered);
    const passCount = entered.filter((s) => s >= maxScore * 0.5).length;
    const passPct = Math.round((passCount / entered.length) * 100);

    return { count: entered.length, avg, avgPct, highest, lowest, passCount, passPct };
  }, [roster, scoresMap, maxScore]);

  // Search Filter
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

  // Export marksheet to CSV
  const handleExportCSV = () => {
    if (roster.length === 0) {
      showToast('warning', 'No students enrolled to export.');
      return;
    }

    const headers = ['Roll No', 'Student Name', 'Email', 'Assessment', 'Score', 'Max Score', 'Percentage', 'Grade'];
    const rows = roster.map((r) => {
      const score = scoresMap[r.enrollment_id] ?? '';
      const pct = score !== '' ? Math.round((parseFloat(score) / maxScore) * 100) : '';
      const gr = score !== '' ? computeGrade(pct).grade : '';
      return [r.roll_no, `"${r.student_name}"`, r.student_email || '', `"${activeAssessmentName}"`, score, maxScore, `${pct}%`, gr];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StudentHub_Marks_${selectedCourseId}_${activeAssessmentName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Gradebook marksheet exported to CSV.');
  };

  const selectedCourseObj = courses.find((c) => c.id === selectedCourseId);

  // ----------------------------------------------------------------
  // STUDENT VIEW (Marks Card & Performance Report)
  // ----------------------------------------------------------------
  if (isStudent) {
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    studentMarks.forEach((m) => {
      if (typeof m.score === 'number' && typeof m.max_score === 'number') {
        totalMarksObtained += m.score;
        totalMaxMarks += m.max_score;
      }
    });

    const overallPct = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 92;
    const overallGrade = computeGrade(overallPct);

    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <h1>My Academic Performance Card</h1>
            <p>Official verified examination, assessment, and project marks</p>
          </div>
        </div>

        {/* Hero Performance Overview */}
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
              background: overallGrade.bg,
              color: overallGrade.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
            }}>
              {overallGrade.grade}
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Cumulative Aggregate</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: overallGrade.color }}>
                {overallPct}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Grade Point Average: {(overallPct / 10).toFixed(2)} / 10.0
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
              <Award size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Marks Scored</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {totalMarksObtained.toFixed(1)} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/ {totalMaxMarks}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Across {studentMarks.length} Evaluated Assessments
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle size={28} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Academic Standing</div>
              <div style={{ marginTop: '0.35rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                  {overallPct >= 80 ? 'Distinction' : overallPct >= 60 ? 'First Class' : 'Pass'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Marksheet Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Subject Assessment Breakdown</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Loading your verified marks records...</span>
              </div>
            ) : studentMarks.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No grade records yet"
                description="Evaluation scores will appear here once entered by faculty."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '110px' }}>Course Code</th>
                    <th style={{ width: '30%', minWidth: '200px' }}>Course Name</th>
                    <th style={{ width: '25%', minWidth: '180px' }}>Assessment Name</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Score</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Grade & Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMarks.map((m) => {
                    const pct = m.max_score > 0 ? Math.round((m.score / m.max_score) * 100) : 100;
                    const gr = computeGrade(pct);
                    return (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-info">{m.course_code}</span></td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{m.course_name}</td>
                        <td style={{ fontWeight: 500, color: '#334155' }}>{m.assessment}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{m.score}</strong>
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}> / {m.max_score}</span>
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: gr.color }}>
                            ({pct}%)
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: 6,
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            background: gr.bg,
                            color: gr.color,
                            border: `1px solid ${gr.color}33`,
                          }}>
                            {gr.grade} Pass
                          </span>
                        </td>
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

  // ----------------------------------------------------------------
  // FACULTY & ADMIN VIEW (Full Gradebook & Marks Entry)
  // ----------------------------------------------------------------
  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Student Performance & Gradebook</h1>
          <p>Record exam marks, compute semester grades, and evaluate classroom performance</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export Marksheet</span>
          </button>
          <button
            className={`btn ${viewStats ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewStats(!viewStats)}
          >
            <BarChart2 size={16} />
            <span>{viewStats ? 'Switch to Gradebook' : 'Assessment Analytics'}</span>
          </button>
        </div>
      </div>

      {/* Gradebook Config Toolbar */}
      <div className="toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', flex: 1 }}>
          {/* Course Selector */}
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
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name} ({c.department})
                </option>
              ))}
            </select>
          </div>

          {/* Assessment Selector / Custom Assessment Toggle */}
          {!viewStats && (
            <div style={{ minWidth: 220, flex: '1 1 220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  Assessment Type
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomAssessment(!isCustomAssessment)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isCustomAssessment ? 'Select Preset' : '+ Custom Assessment'}
                </button>
              </div>

              {isCustomAssessment ? (
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Unit Test 1, Presentation..."
                  value={customAssessment}
                  onChange={(e) => setCustomAssessment(e.target.value)}
                />
              ) : (
                <select
                  className="form-select"
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                >
                  {ASSESSMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Max Score Config */}
          {!viewStats && (
            <div style={{ width: 120 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                Max Score
              </label>
              <input
                type="number"
                min="1"
                max="500"
                className="form-input"
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        {!viewStats && roster.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleSaveMarks}
            disabled={saveLoading}
            style={{ padding: '0.55rem 1.25rem', fontWeight: 700 }}
          >
            {saveLoading ? <Spinner size="sm" white /> : (
              <>
                <Save size={16} />
                <span>Save Grades & Marks</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* GRADEBOOK VIEW */}
      {!viewStats && (
        <>
          {/* Live Performance Stats Tiles */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div className="card" style={{ padding: '1rem', background: '#f8fafc' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Grades Entered</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                {liveStats.count} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/ {roster.length}</span>
              </div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#eff6ff', borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Class Average</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>
                {liveStats.avg} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({liveStats.avgPct}%)</span>
              </div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#ecfdf5', borderLeft: '4px solid #059669' }}>
              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Highest Score</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{liveStats.highest} / {maxScore}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#fffbeb', borderLeft: '4px solid #d97706' }}>
              <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Lowest Score</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706' }}>{liveStats.lowest} / {maxScore}</div>
            </div>
            <div className="card" style={{ padding: '1rem', background: '#f8fafc', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Pass Rate (≥50%)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{liveStats.passPct}%</div>
            </div>
          </div>

          {/* Roster Table Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 className="card-title">
                  Gradebook Sheet — {activeAssessmentName} ({selectedCourseObj?.code || 'Course'})
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Enter numeric scores out of {maxScore}. Grades and percentages auto-compute in real-time.
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2rem', height: 34, fontSize: '0.825rem', width: 170 }}
                />
              </div>
            </div>

            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              {loading ? (
                <div className="loading-container">
                  <Spinner />
                  <span>Loading class gradebook roster...</span>
                </div>
              ) : filteredRoster.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No enrolled students found"
                  description="No students matched your search or are enrolled in this course."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '15%', minWidth: '110px' }}>Roll No</th>
                      <th style={{ width: '25%', minWidth: '160px' }}>Student Name</th>
                      <th style={{ width: '22%', minWidth: '180px' }}>Academic Email</th>
                      <th style={{ width: '20%', minWidth: '160px' }}>Score (Max {maxScore})</th>
                      <th style={{ width: '18%', minWidth: '130px', textAlign: 'center' }}>Computed Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((stu) => {
                      const scoreVal = scoresMap[stu.enrollment_id] ?? '';
                      const hasScore = scoreVal !== '' && scoreVal !== null && scoreVal !== undefined;
                      const numScore = parseFloat(scoreVal);
                      const pct = hasScore && !isNaN(numScore) && maxScore > 0 ? Math.round((numScore / maxScore) * 100) : null;
                      const gradeObj = pct !== null ? computeGrade(pct) : null;

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max={maxScore}
                                className="form-input"
                                style={{ width: 85, fontWeight: 700, textAlign: 'center', height: 36 }}
                                placeholder="—"
                                value={scoreVal}
                                onChange={(e) => handleScoreChange(stu.enrollment_id, e.target.value)}
                              />
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ {maxScore}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {gradeObj ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.75rem',
                                borderRadius: 6,
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                background: gradeObj.bg,
                                color: gradeObj.color,
                                border: `1px solid ${gradeObj.color}33`,
                              }}>
                                <span>{gradeObj.grade}</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({pct}%)</span>
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned</span>
                            )}
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

      {/* ASSESSMENT ANALYTICS VIEW */}
      {viewStats && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Course Assessment Analytics Overview</h2>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div className="loading-container">
                <Spinner />
                <span>Aggregating assessment analytics...</span>
              </div>
            ) : stats.length === 0 ? (
              <EmptyState
                icon={BarChart2}
                title="No assessment stats recorded"
                description="No evaluation scores have been logged for this course yet."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%', minWidth: '180px' }}>Assessment Name</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Evaluated Students</th>
                    <th style={{ width: '20%', minWidth: '140px' }}>Class Average</th>
                    <th style={{ width: '15%', minWidth: '110px' }}>Highest Score</th>
                    <th style={{ width: '20%', minWidth: '130px' }}>Lowest Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((st) => (
                    <tr key={st.assessment}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{st.assessment}</td>
                      <td style={{ fontWeight: 600, color: '#2563eb' }}>{st.totalAssessed}</td>
                      <td>
                        <strong style={{ color: '#059669', fontSize: '1rem' }}>{st.average}</strong>
                      </td>
                      <td style={{ fontWeight: 600, color: '#059669' }}>{st.highest}</td>
                      <td style={{ fontWeight: 600, color: '#dc2626' }}>{st.lowest}</td>
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
