const API_BASE_URL = '/api';

/**
 * Generic HTTP Request Wrapper
 */
export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('sms_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle 204 No Content
    if (res.status === 204) {
      return { success: true };
    }

    const data = await res.json();

    if (!res.ok) {
      // If 401 Unauthorized, remove stale token and notify session expiration
      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('sms_auth_token');
        localStorage.removeItem('sms_user_data');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }

      const error = new Error(data?.error?.message || 'An error occurred during API request.');
      error.code = data?.error?.code || 'API_ERROR';
      error.details = data?.error?.details || null;
      error.status = res.status;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
};

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  changeEmail: (data) => request('/auth/change-email', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Students
  getStudents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/students${query ? `?${query}` : ''}`);
  },
  getStudentById: (id) => request(`/students/${id}`),
  createStudent: (data) => request('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  // Faculty
  getFaculty: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/faculty${query ? `?${query}` : ''}`);
  },
  getFacultyById: (id) => request(`/faculty/${id}`),
  createFaculty: (data) => request('/faculty', { method: 'POST', body: JSON.stringify(data) }),
  updateFaculty: (id, data) => request(`/faculty/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Courses
  getCourses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/courses${query ? `?${query}` : ''}`);
  },
  getCourseById: (id) => request(`/courses/${id}`),
  createCourse: (data) => request('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => request(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),

  // Enrollments
  createEnrollment: (data) => request('/enrollments', { method: 'POST', body: JSON.stringify(data) }),
  bulkEnroll: (data) => request('/enrollments/bulk', { method: 'POST', body: JSON.stringify(data) }),
  deleteEnrollment: (id) => request(`/enrollments/${id}`, { method: 'DELETE' }),

  // Attendance
  getAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance${query ? `?${query}` : ''}`);
  },
  getCourseAttendanceSummary: (courseId) => request(`/attendance/course/${courseId}/summary`),
  recordAttendance: (data) => request('/attendance', { method: 'POST', body: JSON.stringify(data) }),

  // Marks
  getMarks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/marks${query ? `?${query}` : ''}`);
  },
  getCourseMarkStats: (courseId) => request(`/marks/course/${courseId}/stats`),
  recordMarks: (data) => request('/marks', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports${query ? `?${query}` : ''}`);
  },

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit-logs${query ? `?${query}` : ''}`);
  },

  // Exams & Schedule
  getExams: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/exams${query ? `?${query}` : ''}`);
  },
  getUpcomingExams: () => request('/exams/upcoming'),
  createExam: (data) => request('/exams', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id, data) => request(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExam: (id) => request(`/exams/${id}`, { method: 'DELETE' }),

  // Health
  getHealth: () => request('/health'),
};
