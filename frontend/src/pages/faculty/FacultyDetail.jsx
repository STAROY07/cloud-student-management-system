import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  BookOpen,
  ArrowLeft,
  Mail,
  Building,
  Award,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';

export const FacultyDetail = () => {
  const { id } = useParams();
  const { showToast } = useToast();

  const [facultyData, setFacultyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.getFacultyById(id);
        if (res.success) {
          setFacultyData(res.data);
        }
      } catch (err) {
        showToast('error', err.message || 'Failed to load faculty profile.');
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
        <span>Loading faculty profile...</span>
      </div>
    );
  }

  if (!facultyData?.faculty) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3>Faculty profile not found</h3>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>The requested faculty member does not exist.</p>
        <Link to="/faculty" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Faculty Directory
        </Link>
      </div>
    );
  }

  const { faculty, assignedCourses } = facultyData;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/faculty" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} />
          <span>Back to Faculty Directory</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#059669',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 700,
          }}>
            {faculty.name.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>{faculty.name}</h1>
              <StatusBadge status={faculty.status} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <strong style={{ color: '#059669' }}>{faculty.employee_id}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Award size={14} /> {faculty.designation}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building size={14} /> {faculty.department}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} /> {faculty.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Courses List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Assigned Course Offerings ({assignedCourses?.length || 0})</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {assignedCourses.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No active courses currently assigned to this faculty member.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Credits</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Enrolled Students</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedCourses.map((c) => (
                  <tr key={c.id}>
                    <td><span className="badge badge-info">{c.code}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.credits} Credits</td>
                    <td>{c.department}</td>
                    <td>Semester {c.semester}</td>
                    <td>
                      <strong>{c.enrolled_students_count}</strong> students
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/courses/${c.id}`} className="btn btn-secondary btn-sm">
                        <span>Course Details</span>
                      </Link>
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
};
