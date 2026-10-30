import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, ArrowLeft, RefreshCw, GraduationCap, CheckCircle } from 'lucide-react';
import { adminService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AcademicManagementPage() {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDept, setCourseDept] = useState('School of Computing');

  // New Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getCourses();
      setCourses(res.data.courses || []);
      if (res.data.courses && res.data.courses.length > 0) {
        setSelectedCourseId(res.data.courses[0].id);
      }
    } catch {
      toast.error('Failed to load courses.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await adminService.createCourse({
        code: courseCode.trim().toUpperCase(),
        name: courseName.trim(),
        department: courseDept.trim()
      });
      toast.success('Course created successfully!');
      setShowCourseModal(false);
      setCourseCode('');
      setCourseName('');
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create course.');
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await adminService.createSubject({
        code: subjectCode.trim().toUpperCase(),
        name: subjectName.trim(),
        course_id: selectedCourseId
      });
      toast.success('Subject created and mapped to course!');
      setShowSubjectModal(false);
      setSubjectCode('');
      setSubjectName('');
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create subject.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <GraduationCap className="w-3.5 h-3.5" /> Curriculum & Department Structure
            </div>
            <h1 className="text-2xl font-bold text-white">Academic Courses & Subjects</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure degree programs and subjects for test assignment and student enrollment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" /> Add Degree / Course
            </button>
            <button
              onClick={() => setShowSubjectModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-purple-400" /> Add Subject
            </button>
          </div>
        </div>

        {/* Courses Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-bold">
                    {course.code}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{course.name}</h3>
                  <div className="text-xs text-slate-400">{course.department}</div>
                </div>
                <span className="text-xs text-slate-500 font-semibold">{course.subjects_count} Subjects</span>
              </div>
            </div>
          ))}
        </div>

        {/* Add Course Modal */}
        {showCourseModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Create Degree / Program</h3>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g. CSE-2026"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Program Name</label>
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={courseDept}
                    onChange={(e) => setCourseDept(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    Save Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Subject Modal */}
        {showSubjectModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Add Curriculum Subject</h3>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Associate with Degree</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="e.g. CS-402"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. Artificial Intelligence & Ethics"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubjectModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                  >
                    Save Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
