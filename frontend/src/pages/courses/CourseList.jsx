import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  Plus,
  BookOpen,
  Eye,
  Trash2,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { DepartmentOptions, SemesterOptions } from '../../components/common/AcademicOptions';

export const CourseList = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');

  // Add Course Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: 3,
    department: 'Computer Science',
    semester: 5,
    facultyId: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.getCourses({ search, department, semester });
      if (res.success) {
        setCourses(res.data.courses);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to fetch courses.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacultyList = async () => {
    try {
      const res = await api.getFaculty();
      if (res.success) {
        setFacultyList(res.data.faculty);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [department, semester]);

  useEffect(() => {
    if (isAdmin) {
      fetchFacultyList();
    }
  }, [isAdmin]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await api.createCourse({
        ...formData,
        credits: parseInt(formData.credits, 10),
        semester: parseInt(formData.semester, 10),
        facultyId: formData.facultyId || null,
      });

      showToast('success', `Course ${formData.code} created successfully.`);
      setIsAddModalOpen(false);
      setFormData({
        code: '',
        name: '',
        credits: 3,
        department: 'Computer Science',
        semester: 5,
        facultyId: '',
      });
      fetchCourses();
    } catch (err) {
      showToast('error', err.message || 'Failed to create course.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCourse = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete course ${code}?`)) return;

    try {
      await api.deleteCourse(id);
      showToast('success', `Course ${code} deleted.`);
      fetchCourses();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete course.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Course Catalog</h1>
          <p>Academic curriculum, credit assignments, and faculty instructor allocations</p>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Create Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} className="search-input-group">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-group">
          <select
            className="form-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{ width: 190 }}
          >
            <DepartmentOptions placeholder="All Departments" />
          </select>

          <select
            className="form-select"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            style={{ width: 140 }}
          >
            <SemesterOptions placeholder="All Semesters" />
          </select>

          <button className="btn btn-secondary" onClick={fetchCourses}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <Spinner />
            <span>Loading course curriculum...</span>
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            description="Try adjusting your filters or register a new course."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Code</th>
                <th>Course Name</th>
                <th style={{ width: '85px' }}>Credits</th>
                <th>Department</th>
                <th style={{ width: '95px' }}>Semester</th>
                <th>Faculty Lead</th>
                <th style={{ width: '95px' }}>Enrolled</th>
                <th style={{ textAlign: 'right', width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><span className="badge badge-info">{c.code}</span></td>
                  <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{c.credits} Credits</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{c.department}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>Semester {c.semester}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {c.faculty_name ? (
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{c.faculty_name}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>{c.enrolled_count}</span> students
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <Link to={`/courses/${c.id}`} className="btn btn-secondary btn-sm">
                        <Eye size={14} />
                        <span>Roster</span>
                      </Link>
                      {isAdmin && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteCourse(c.id, c.code)}
                          title="Delete course"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Course Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Academic Course"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddCourse} disabled={formLoading}>
              {formLoading ? <Spinner size="sm" white /> : 'Save Course'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddCourse}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Course Code *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. CS505"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Credits *</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="10"
                required
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Course Name *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Distributed Cloud Computing"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select
                className="form-select"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <DepartmentOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Semester *</label>
              <select
                className="form-select"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                <SemesterOptions />
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Faculty Instructor</label>
            <select
              className="form-select"
              value={formData.facultyId}
              onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
            >
              <option value="">-- Select Instructor (Optional) --</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.department})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
