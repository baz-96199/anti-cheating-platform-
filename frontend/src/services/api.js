import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('examguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        localStorage.removeItem('examguard_token');
        localStorage.removeItem('examguard_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const faceService = {
  register: (data) => api.post('/face/register', data),
  verify: (data) => api.post('/face/verify', data),
  deleteTemplate: () => api.delete('/face/delete'),
};

export const examService = {
  start: (data) => api.post('/exam/start', data),
  autosave: (data) => api.post('/exam/autosave', data),
  submit: (data) => api.post('/exam/submit', data),
  getState: (attemptId) => api.get(`/exam/state/${attemptId}`),
};

export const proctoringService = {
  analyzeFrame: (data) => api.post('/proctoring/analyze-frame', data),
  logEvent: (data) => api.post('/proctoring/event', data),
  getEvents: (attemptId) => api.get(`/proctoring/events/${attemptId}`),
};

export const studentService = {
  getDashboard: () => api.get('/student/dashboard'),
  getExams: () => api.get('/student/exams'),
  verifyCode: (code) => api.post('/student/exam/verify-code', { exam_code: code }),
  getResults: () => api.get('/student/results'),
  getResultDetail: (attemptId) => api.get(`/student/result/${attemptId}`),
  submitAppeal: (data) => api.post('/student/appeals', data),
  getAppeals: () => api.get('/student/appeals'),
};

export const teacherService = {
  getDashboard: () => api.get('/teacher/dashboard'),
  getExams: () => api.get('/teacher/exams'),
  createExam: (data) => api.post('/teacher/exams', data),
  updateExam: (id, data) => api.put(`/teacher/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/teacher/exams/${id}`),
  generateQuizAi: (data) => api.post('/teacher/generate-quiz', data),
  addQuestion: (data) => api.post('/teacher/questions', data),
  batchImportQuestions: (data) => api.post('/teacher/questions/batch', data),
  deleteQuestion: (id) => api.delete(`/teacher/questions/${id}`),
  getQuestionBanks: () => api.get('/teacher/question-banks'),
  createQuestionBank: (data) => api.post('/teacher/question-banks', data),
  getSubmissions: (examId) => api.get(`/teacher/exams/${examId}/submissions`),
  getAttemptDetail: (attemptId) => api.get(`/teacher/attempts/${attemptId}`),
  reviewAttempt: (attemptId, data) => api.post(`/teacher/attempts/${attemptId}/review`, data),
  reviewEvent: (eventId, data) => api.post(`/teacher/events/${eventId}/review`, data),
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  approveTeacher: (userId) => api.post(`/admin/teachers/${userId}/approve`),
  rejectTeacher: (userId) => api.post(`/admin/teachers/${userId}/reject`),
  toggleUserStatus: (userId) => api.post(`/admin/users/${userId}/toggle-status`),
  getCourses: () => api.get('/admin/courses'),
  createCourse: (data) => api.post('/admin/courses', data),
  createSubject: (data) => api.post('/admin/subjects', data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getDisputes: () => api.get('/admin/disputes'),
  resolveDispute: (appealId, data) => api.post(`/admin/disputes/${appealId}/resolve`, data),
};

export const reportService = {
  downloadAttemptPdf: (attemptId) => {
    return `/api/reports/attempt/${attemptId}/pdf`;
  },
  downloadExamCsv: (examId) => {
    return `/api/reports/exam/${examId}/csv`;
  }
};

export const notificationService = {
  getNotifications: (limit = 10) => api.get('/notifications', { params: { limit } }),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export default api;
