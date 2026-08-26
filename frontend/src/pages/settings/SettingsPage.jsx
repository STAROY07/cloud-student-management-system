import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Settings,
  Lock,
  User,
  Activity,
  Server,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  Shield,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Spinner } from '../../components/common/Spinner';
import { StatusBadge } from '../../components/common/Badge';

export const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password Visibility Toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Cloud Telemetry & Health Probe
  const [healthData, setHealthData] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user]);

  const fetchHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthError('');
      const res = await api.getHealth();
      setHealthData(res);
    } catch (err) {
      console.error('[Settings] Health probe failed:', err);
      setHealthData(null);
      setHealthError(err.message || 'Health probe unreachable.');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const isHealthy = ['OK', 'HEALTHY'].includes(healthData?.status);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      showToast('error', 'Full name must be at least 2 characters.');
      return;
    }

    try {
      setProfileLoading(true);
      const res = await api.updateProfile({ name: name.trim(), phone: phone.trim() });
      if (!res.success || !res.data?.user) {
        throw new Error(res.error?.message || 'Failed to update profile.');
      }
      updateUser(res.data.user);
      showToast('success', 'Personal profile updated successfully.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', 'New password must be at least 8 characters.');
      return;
    }

    try {
      setPassLoading(true);
      await api.changePassword({ currentPassword, newPassword });
      showToast('success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('error', err.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      showToast('error', 'Please enter a valid university email address.');
      return;
    }
    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      showToast('error', 'New email address must be different from current email.');
      return;
    }
    if (newEmail.trim().toLowerCase() !== confirmNewEmail.trim().toLowerCase()) {
      showToast('error', 'New email confirmation does not match.');
      return;
    }
    if (!emailPassword) {
      showToast('error', 'Current password is required to verify identity.');
      return;
    }

    try {
      setEmailLoading(true);
      const res = await api.changeEmail({
        newEmail: newEmail.trim().toLowerCase(),
        currentPassword: emailPassword,
      });

      if (!res.success || !res.data?.user) {
        throw new Error(res.error?.message || 'Failed to update email address.');
      }
      updateUser(res.data.user);
      showToast('success', 'University email updated successfully! Use new email for next login.');
      setNewEmail('');
      setConfirmNewEmail('');
      setEmailPassword('');
    } catch (err) {
      showToast('error', err.message || 'Failed to update email address.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>My Profile & Settings</h1>
          <p>Personal profile management, security preferences, and cloud telemetry</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 1. Full-Width Personal Profile Information Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} color="#2563eb" />
              <h2 className="card-title">Personal Profile Information</h2>
            </div>
            <span className={`user-role-badge ${user?.role?.toLowerCase()}`}>
              {user?.role}
            </span>
          </div>
          <div className="card-body">
            {/* Profile Header Avatar & Key Metadata */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingBottom: '1.25rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {user?.name}
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '2px 0 0' }}>
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Metadata chips */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {user?.department && (
                  <span className="badge badge-neutral">
                    {user.department}
                  </span>
                )}
                {user?.rollNo && (
                  <span className="badge badge-info">
                    Roll: {user.rollNo}
                  </span>
                )}
                {user?.designation && (
                  <span className="badge badge-neutral">
                    {user.designation}
                  </span>
                )}
                {user?.semester && (
                  <span className="badge badge-neutral">
                    Semester {user.semester}
                  </span>
                )}
                <span className="badge badge-success">
                  Status: Active
                </span>
              </div>
            </div>

            {/* Edit Profile Form */}
            <form onSubmit={handleUpdateProfile}>
              <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name (Editable) *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number (Editable) *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Primary Email Address (System Fixed)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={user?.email || ''}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <input
                    type="text"
                    className="form-input"
                    value={user?.role || ''}
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Additional Protected Academic Details */}
              {user?.department && (
                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-input"
                      value={user.department}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                    />
                  </div>
                  {user?.rollNo && (
                    <div className="form-group">
                      <label className="form-label">Roll Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={user.rollNo}
                        disabled
                        style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                      />
                    </div>
                  )}
                  {user?.designation && (
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input
                        type="text"
                        className="form-input"
                        value={user.designation}
                        disabled
                        style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '0.5rem',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.775rem',
                  color: '#64748b',
                }}>
                  <ShieldCheck size={15} color="#059669" />
                  <span>Academic identity and role records are strictly protected by server-side RBAC.</span>
                </div>

                <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                  {profileLoading ? <Spinner size="sm" white /> : (
                    <>
                      <Save size={15} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 2. Side-by-Side Two-Column Row: Email Address & Security Password */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}>
          {/* Edit University Email Address Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} color="#2563eb" />
                <h2 className="card-title">Edit University Email Address</h2>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <form onSubmit={handleChangeEmail} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Current University Email</label>
                    <input
                      type="text"
                      className="form-input"
                      value={user?.email || ''}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', fontWeight: 600 }}
                    />
                  </div>

                  <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">New University Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. name@university.edu"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        required
                        value={confirmNewEmail}
                        onChange={(e) => setConfirmNewEmail(e.target.value)}
                        placeholder="Repeat new email"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Current Password (Verify Identity) *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showEmailPassword ? 'text' : 'password'}
                        className="form-input"
                        style={{ paddingRight: '2.5rem' }}
                        required
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Enter current password to authorize email change"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailPassword(!showEmailPassword)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 4,
                        }}
                        title={showEmailPassword ? 'Hide password' : 'Show password'}
                      >
                        {showEmailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.65rem 0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    <AlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <span>Your sign-in identifier will update immediately upon saving.</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-secondary" disabled={emailLoading} style={{ alignSelf: 'flex-start' }}>
                  {emailLoading ? <Spinner size="sm" /> : (
                    <>
                      <Save size={15} />
                      <span>Save Email Address</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} color="#64748b" />
                <h2 className="card-title">Security & Password</h2>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Current Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        className="form-input"
                        style={{ paddingRight: '2.5rem' }}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 4,
                        }}
                        title={showCurrentPass ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">New Password (Min 8 chars) *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          className="form-input"
                          style={{ paddingRight: '2.5rem' }}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4,
                          }}
                          title={showNewPass ? 'Hide password' : 'Show password'}
                        >
                          {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          className="form-input"
                          style={{ paddingRight: '2.5rem' }}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4,
                          }}
                          title={showConfirmPass ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.65rem 0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}>
                    <Lock size={14} color="#64748b" style={{ flexShrink: 0 }} />
                    <span>Password must contain at least 8 characters with numbers and symbols.</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-secondary" disabled={passLoading} style={{ alignSelf: 'flex-start' }}>
                  {passLoading ? <Spinner size="sm" /> : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 3. Full-Width Google Cloud Telemetry & Health Probe */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#059669" />
              <h2 className="card-title">Google Cloud Health & Telemetry</h2>
            </div>
            <button
              className="btn-icon"
              onClick={fetchHealth}
              title="Refresh probe"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="card-body">
            {healthLoading ? (
              <div className="loading-container">
                <Spinner size="sm" />
                <span>Checking runtime health...</span>
              </div>
            ) : healthData ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: isHealthy ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${isHealthy ? '#a7f3d0' : '#fecaca'}`,
                  borderRadius: 6,
                  marginBottom: '1.25rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: isHealthy ? '#059669' : '#b91c1c',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}>
                    {isHealthy ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>Liveness & Readiness: {healthData.status}</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: isHealthy ? '#047857' : '#b91c1c',
                    fontWeight: 600,
                  }}>Uptime: {healthData.uptimeSeconds}s</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.85rem',
                }}>
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Service Name</div>
                    <strong style={{ color: '#0f172a' }}>{healthData.service}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Environment</div>
                    <span className="badge badge-neutral">{healthData.environment}</span>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Database Engine</div>
                    <strong style={{ color: '#0f172a' }}>{healthData.database?.mode}</strong>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Database Status</div>
                    <StatusBadge status={healthData.database?.status} />
                    {healthData.database?.error && (
                      <div style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                        {healthData.database.error}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Node.js Runtime</div>
                    <code>{healthData.runtime?.nodeVersion} ({healthData.runtime?.platform})</code>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Memory RSS</div>
                    <code>{healthData.runtime?.memory?.rssMb} MB</code>
                  </div>

                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Heap Memory</div>
                    <code>{healthData.runtime?.memory?.heapUsedMb} MB / {healthData.runtime?.memory?.heapTotalMb} MB</code>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                {healthError || 'Health probe unreachable.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
