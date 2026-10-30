import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import StudentRegisterPage from './pages/auth/StudentRegisterPage';
import TeacherRegisterPage from './pages/auth/TeacherRegisterPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentExamsPage from './pages/student/StudentExamsPage';
import FaceEnrollmentPage from './pages/student/FaceEnrollmentPage';
import ExamEntrancePage from './pages/student/ExamEntrancePage';
import ActiveExamRoom from './pages/student/ActiveExamRoom';
import StudentResultPage from './pages/student/StudentResultPage';
import StudentResultsListPage from './pages/student/StudentResultsListPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import CreateExamPage from './pages/teacher/CreateExamPage';
import AiQuizGeneratorPage from './pages/teacher/AiQuizGeneratorPage';
import QuestionBanksPage from './pages/teacher/QuestionBanksPage';
import ExamSubmissionsPage from './pages/teacher/ExamSubmissionsPage';
import AttemptReviewPage from './pages/teacher/AttemptReviewPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import AcademicManagementPage from './pages/admin/AcademicManagementPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import DisputeResolutionPage from './pages/admin/DisputeResolutionPage';

// Protected Route Wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to user's assigned role portal
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register/student" element={<StudentRegisterPage />} />
                <Route path="/register/teacher" element={<TeacherRegisterPage />} />

                {/* Student Protected Routes */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/exams"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentExamsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/face-enroll"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <FaceEnrollmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/results"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentResultsListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/results/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                      <StudentResultPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exam/entrance/:examId"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ExamEntrancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exam/take/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <ActiveExamRoom />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher Protected Routes */}
                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/exams/create"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <CreateExamPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/ai-generator"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <AiQuizGeneratorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/question-banks"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <QuestionBanksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/exams/:examId/submissions"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                      <ExamSubmissionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/attempts/:attemptId/review"
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                      <AttemptReviewPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Protected Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UserManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/academic"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AcademicManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/disputes"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <DisputeResolutionPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
