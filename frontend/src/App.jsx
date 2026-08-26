import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Pages
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { StudentList } from './pages/students/StudentList';
import { StudentDetail } from './pages/students/StudentDetail';
import { FacultyList } from './pages/faculty/FacultyList';
import { FacultyDetail } from './pages/faculty/FacultyDetail';
import { CourseList } from './pages/courses/CourseList';
import { CourseDetail } from './pages/courses/CourseDetail';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { MarksPage } from './pages/marks/MarksPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ExamSchedulePage } from './pages/exams/ExamSchedulePage';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Application Shell */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Students Module */}
                <Route
                  path="students"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route path="students/:id" element={<StudentDetail />} />

                {/* Faculty Module */}
                <Route
                  path="faculty"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
                      <FacultyList />
                    </ProtectedRoute>
                  }
                />
                <Route path="faculty/:id" element={<FacultyDetail />} />

                {/* Courses Module */}
                <Route path="courses" element={<CourseList />} />
                <Route path="courses/:id" element={<CourseDetail />} />

                {/* Attendance & Marks Modules */}
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="marks" element={<MarksPage />} />
                <Route path="exams" element={<ExamSchedulePage />} />

                {/* Reports Module */}
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
                      <ReportsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Audit Module (Admin only) */}
                <Route
                  path="audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Settings Module */}
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback Catch-All */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
