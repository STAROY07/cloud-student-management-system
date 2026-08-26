import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ForcedPasswordChangeModal } from '../auth/ForcedPasswordChangeModal';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronRight,
  Server,
  User,
  Menu,
  X,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export const AppShell = () => {
  const { user, logout, isAdmin, isFaculty, isStudent, authError } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  // Generate breadcrumb titles from pathname
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbNameMap = {
    dashboard: 'Dashboard',
    students: 'Students',
    faculty: 'Faculty',
    courses: 'Courses',
    attendance: 'Attendance',
    marks: 'Marks & Grades',
    exams: 'Exam Schedule',
    reports: 'Academic Reports',
    'audit-logs': 'Audit Logs',
    settings: 'Settings & Profile',
  };

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileNavOpen && (
        <div className="sidebar-overlay" onClick={closeMobileNav} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-icon">
              <Server size={18} />
            </div>
            <div>
              <div className="brand-title">Cloud SMS</div>
              <div className="brand-subtitle">Semester 5 Platform</div>
            </div>
          </div>
          {/* Close button on mobile inside drawer */}
          <button
            className="mobile-menu-btn"
            onClick={closeMobileNav}
            style={{ color: '#94a3b8' }}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Core Navigation</div>

          <NavLink
            to="/dashboard"
            onClick={closeMobileNav}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          {/* Role-Specific Navigation */}
          {isAdmin && (
            <>
              <div className="nav-section-title">Administration</div>
              <NavLink to="/students" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <GraduationCap size={18} />
                <span>Students</span>
              </NavLink>
              <NavLink to="/faculty" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Faculty</span>
              </NavLink>
              <NavLink to="/courses" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Courses</span>
              </NavLink>
              <NavLink to="/attendance" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CalendarCheck size={18} />
                <span>Attendance</span>
              </NavLink>
              <NavLink to="/marks" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Award size={18} />
                <span>Marks & Grades</span>
              </NavLink>
              <NavLink to="/exams" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Exam Schedule</span>
              </NavLink>
              <NavLink to="/reports" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Academic Reports</span>
              </NavLink>

              <div className="nav-section-title">Security & Audit</div>
              <NavLink to="/audit-logs" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShieldAlert size={18} />
                <span>Audit Logs</span>
              </NavLink>
            </>
          )}

          {isFaculty && (
            <>
              <div className="nav-section-title">Academic Management</div>
              <NavLink to="/courses" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>My Courses</span>
              </NavLink>
              <NavLink to="/students" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <GraduationCap size={18} />
                <span>Students</span>
              </NavLink>
              <NavLink to="/attendance" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CalendarCheck size={18} />
                <span>Record Attendance</span>
              </NavLink>
              <NavLink to="/marks" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Award size={18} />
                <span>Enter Marks</span>
              </NavLink>
              <NavLink to="/exams" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Exam Schedule</span>
              </NavLink>
              <NavLink to="/reports" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Class Analytics</span>
              </NavLink>
            </>
          )}

          {isStudent && (
            <>
              <div className="nav-section-title">Academic Portal</div>
              <NavLink
                to={user?.studentId ? `/students/${user.studentId}` : '/dashboard'}
                onClick={closeMobileNav}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <User size={18} />
                <span>My Academic File</span>
              </NavLink>
              <NavLink to="/courses" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Enrolled Courses</span>
              </NavLink>
              <NavLink to="/attendance" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CalendarCheck size={18} />
                <span>My Attendance</span>
              </NavLink>
              <NavLink to="/marks" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Award size={18} />
                <span>My Grades & Marks</span>
              </NavLink>
              <NavLink to="/exams" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Exam Schedule</span>
              </NavLink>
            </>
          )}

          <div className="nav-section-title">Account & System</div>
          <NavLink to="/settings" onClick={closeMobileNav} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={18} />
            <span>My Profile & Settings</span>
          </NavLink>
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <span className={`user-role-badge ${user?.role?.toLowerCase()}`}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-icon"
              title="Sign out"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="app-main">
        {/* Top Header */}
        <header className="app-header">
          <div className="header-left">
            {/* Hamburger Button for Mobile */}
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label="Toggle navigation drawer"
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumbs">
              <span>App</span>
              {pathParts.map((part, index) => (
                <React.Fragment key={part}>
                  <ChevronRight size={14} className="breadcrumb-separator" />
                  <span className={index === pathParts.length - 1 ? 'breadcrumb-current' : ''}>
                    {breadcrumbNameMap[part] || part}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="header-right">
            <div className="header-badge">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
              Google Cloud Run • Active
            </div>
          </div>
        </header>

        {/* Dynamic Multi-Page Router View */}
        <main className="page-container">
          {authError && (
            <div
              className="card"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                borderColor: '#fecaca',
                color: '#b91c1c',
              }}
            >
              <AlertTriangle size={16} color="#dc2626" />
              <span>{authError}</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Mandatory Password Reset for Initialized / Temporary Accounts */}
      <ForcedPasswordChangeModal />
    </div>
  );
};

