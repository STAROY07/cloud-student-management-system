import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  Plus,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Phone,
  Lock,
  User,
  BookOpen,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { DepartmentOptions, SemesterOptions } from '../../components/common/AcademicOptions';

export const StudentList = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalRecords: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');

  // Add Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNo: '',
    department: 'Computer Science',
    semester: 5,
    admissionYear: 2024,
    password: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchStudents = async (page = 1) => {
    try {
      setLoading(true);
      const res = await api.getStudents({
        page,
        limit: 10,
        search,
        department,
        semester,
      });

      if (res.success) {
        setStudents(res.data.students);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [department, semester]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      showToast('error', 'Temporary password must be at least 6 characters.');
      return;
    }
    if (!formData.phone || formData.phone.length < 7) {
      showToast('error', 'Please enter a valid phone number (at least 7 digits).');
      return;
    }

    try {
      setFormLoading(true);
      await api.createStudent({
        ...formData,
        semester: parseInt(formData.semester, 10),
        admissionYear: parseInt(formData.admissionYear, 10),
      });

      showToast('success', `Student account for ${formData.name} created successfully.`);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        rollNo: '',
        department: 'Computer Science',
        semester: 5,
        admissionYear: 2024,
        password: '',
      });
      fetchStudents(1);
    } catch (err) {
      showToast('error', err.message || 'Failed to create student.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = async (id, rollNo) => {
    if (!window.confirm(`Are you sure you want to deactivate student ${rollNo}?`)) return;

    try {
      await api.deleteStudent(id);
      showToast('success', `Student ${rollNo} deactivated.`);
      fetchStudents(pagination.page);
    } catch (err) {
      showToast('error', err.message || 'Failed to deactivate student.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Student Directory</h1>
          <p>Manage enrolled students, academic departments, and official credentials</p>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Register Student</span>
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
            placeholder="Search by name, email, phone, or roll no..."
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

          <button className="btn btn-secondary" onClick={() => fetchStudents(pagination.page)}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <Spinner />
            <span>Loading student records...</span>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No students found"
            description="Try adjusting your search criteria or register a new student."
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Roll No</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th style={{ width: '135px' }}>Phone</th>
                  <th>Department</th>
                  <th style={{ width: '90px' }}>Semester</th>
                  <th style={{ width: '85px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu) => (
                  <tr key={stu.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#2563eb', fontWeight: 600 }}>{stu.roll_no}</strong>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{stu.name}</td>
                    <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                      {stu.email}
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {stu.phone || '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{stu.department}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>Semester {stu.semester}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={stu.status} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <Link to={`/students/${stu.id}`} className="btn btn-secondary btn-sm" title="View details">
                          <Eye size={14} />
                          <span>View</span>
                        </Link>
                        {isAdmin && stu.status === 'ACTIVE' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeactivate(stu.id, stu.roll_no)}
                            title="Deactivate student"
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

            {/* Pagination */}
            <div className="pagination-container">
              <span className="pagination-info">
                Showing <strong>{students.length}</strong> of <strong>{pagination.totalRecords}</strong> students
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchStudents(pagination.page - 1)}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                <span className="pagination-current">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchStudents(pagination.page + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Admin Student Registration Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddStudent} disabled={formLoading}>
              {formLoading ? <Spinner size="sm" white /> : 'Save Student'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section 1: Personal Information */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
              <User size={15} color="#2563eb" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                Personal Information
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Marcus Vance"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">University Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student.marcus@university.edu"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 345-6789"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Academic Information */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
              <BookOpen size={15} color="#2563eb" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                Academic Information
              </span>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Roll Number *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  placeholder="CS2024-006"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Admission Year *</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  min={2000}
                  max={2100}
                  value={formData.admissionYear}
                  onChange={(e) => setFormData({ ...formData, admissionYear: e.target.value })}
                />
              </div>
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
          </div>

          {/* Section 3: Account Credentials */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
              <Lock size={15} color="#2563eb" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>
                Account Security (Temporary Password)
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Temporary Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set initial password (min 6 characters)"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                🔒 The student will be forced to change this temporary password upon their first sign-in.
              </span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
