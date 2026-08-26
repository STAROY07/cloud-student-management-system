import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  Plus,
  Users,
  Eye,
  Mail,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { DepartmentOptions } from '../../components/common/AcademicOptions';

export const FacultyList = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');

  // Add Faculty Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: 'Computer Science',
    designation: 'Associate Professor',
    password: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await api.getFaculty({ search, department });
      if (res.success) {
        setFaculty(res.data.faculty);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to fetch faculty list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, [department]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFaculty();
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await api.createFaculty(formData);
      showToast('success', `Faculty member ${formData.name} added successfully.`);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        email: '',
        employeeId: '',
        department: 'Computer Science',
        designation: 'Associate Professor',
        password: '',
      });
      fetchFaculty();
    } catch (err) {
      showToast('error', err.message || 'Failed to add faculty member.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Faculty Directory</h1>
          <p>Academic professors, department chairs, and teaching staff</p>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={16} />
              <span>Add Faculty</span>
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
            placeholder="Search by name, email, or employee ID..."
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

          <button className="btn btn-secondary" onClick={fetchFaculty}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <Spinner />
            <span>Loading faculty records...</span>
          </div>
        ) : faculty.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No faculty members found"
            description="Try adjusting your search criteria or register a new faculty member."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Emp ID</th>
                <th>Name & Designation</th>
                <th>Email</th>
                <th>Department</th>
                <th style={{ width: '130px' }}>Assigned Courses</th>
                <th style={{ width: '85px' }}>Status</th>
                <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faculty.map((f) => (
                <tr key={f.id}>
                  <td style={{ whiteSpace: 'nowrap' }}><strong style={{ color: '#2563eb', fontWeight: 600 }}>{f.employee_id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>{f.designation}</div>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.875rem' }}>{f.email}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{f.department}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="badge badge-info">{f.assigned_courses_count} Courses</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={f.status} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link to={`/faculty/${f.id}`} className="btn btn-secondary btn-sm">
                      <Eye size={14} />
                      <span>View</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Faculty Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Faculty Member"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleAddFaculty} disabled={formLoading}>
              {formLoading ? <Spinner size="sm" white /> : 'Save Faculty'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAddFaculty}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Alan Turing"
            />
          </div>

          <div className="form-group">
            <label className="form-label">University Email Address *</label>
            <input
              type="email"
              className="form-input"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="dr.turing@university.edu"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Employee ID *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="FAC-CS-004"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Professor"
              />
            </div>
          </div>

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
        </form>
      </Modal>
    </div>
  );
};
