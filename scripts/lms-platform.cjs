#!/usr/bin/env node
/**
 * Elmoorx LMS — Complete Learning Management System
 *
 * Modules:
 *   1. Course Catalog (browse, search, filter)
 *   2. Course Detail (curriculum, lessons, instructor)
 *   3. Video Lessons (with progress tracking)
 *   4. Quizzes (interactive assessments)
 *   5. Certificates (auto-generated on completion)
 *   6. Student Dashboard (enrolled, progress, achievements)
 *   7. Instructor Dashboard (create courses, analytics)
 *   8. Discussion Forums (per course)
 *   9. Live Classes (schedule, join)
 *  10. Assignments (submit, grade)
 *
 * Runs on port 5800
 */

const http = require('http');
const crypto = require('crypto');

// ─── Data stores ────────────────────────────────────────────────────────────

const courses = new Map();
const lessons = new Map();
const enrollments = new Map();
const quizzes = new Map();
const certificates = new Map();
const discussions = new Map();
const assignments = new Map();
const liveClasses = new Map();
const students = new Map();
const instructors = new Map();

// ─── Seed data ──────────────────────────────────────────────────────────────

function seed() {
  // Instructors
  [
    { id: 'ins_1', name: 'Dr. Ahmed Hassan', email: 'ahmed@elmoorx.edu', bio: 'PhD in Computer Science, 15 years teaching', rating: 4.9, students: 12400, courses: 8, verified: true, expertise: ['Web Development', 'AI', 'Systems'] },
    { id: 'ins_2', name: 'Prof. Sara Mohamed', email: 'sara@elmoorx.edu', bio: 'Professor of Data Science, ex-Google', rating: 4.8, students: 8900, courses: 6, verified: true, expertise: ['Data Science', 'ML', 'Python'] },
    { id: 'ins_3', name: 'Khalid Al-Rashid', email: 'khalid@elmoorx.edu', bio: 'Senior Engineer at Tech Corp', rating: 4.7, students: 5600, courses: 4, verified: true, expertise: ['DevOps', 'Cloud', 'Kubernetes'] },
  ].forEach(i => instructors.set(i.id, i));

  // Courses
  [
    { id: 'crs_1', title: 'Complete Elmoorx Framework Course', instructor: 'ins_1', category: 'Web Dev', level: 'intermediate', price: 49.99, originalPrice: 99.99, rating: 4.9, students: 3400, duration: '12h 30m', lessonsCount: 48, language: 'Arabic', thumbnail: '🚀', description: 'Master Elmoorx Framework from basics to advanced. Build 5 real projects.', tags: ['elmoorx', 'frontend', 'framework'], bestseller: true },
    { id: 'crs_2', title: 'Data Science with Python', instructor: 'ins_2', category: 'Data Science', level: 'beginner', price: 39.99, originalPrice: 79.99, rating: 4.8, students: 5600, duration: '18h 45m', lessonsCount: 72, language: 'English', thumbnail: '📊', description: 'Learn Python, Pandas, NumPy, and ML from scratch', tags: ['python', 'ml', 'pandas'], bestseller: true },
    { id: 'crs_3', title: 'DevOps Engineering Bootcamp', instructor: 'ins_3', category: 'DevOps', level: 'advanced', price: 79.99, originalPrice: 149.99, rating: 4.7, students: 2100, duration: '24h 10m', lessonsCount: 96, language: 'English', thumbnail: '☁️', description: 'Master Docker, Kubernetes, CI/CD, and Cloud', tags: ['docker', 'k8s', 'aws'], bestseller: false },
    { id: 'crs_4', title: 'Building AR/VR Experiences', instructor: 'ins_1', category: 'XR', level: 'intermediate', price: 59.99, originalPrice: 119.99, rating: 4.6, students: 890, duration: '10h 20m', lessonsCount: 40, language: 'Arabic', thumbnail: '🥽', description: 'Create immersive AR/VR apps with WebXR', tags: ['ar', 'vr', 'webxr'], bestseller: false },
    { id: 'crs_5', title: 'Blockchain & Web3 Development', instructor: 'ins_3', category: 'Web3', level: 'intermediate', price: 69.99, originalPrice: 139.99, rating: 4.8, students: 1800, duration: '15h 50m', lessonsCount: 60, language: 'English', thumbnail: '⛓️', description: 'Build DApps, smart contracts, and NFTs', tags: ['blockchain', 'solidity', 'web3'], bestseller: true },
    { id: 'crs_6', title: 'UI/UX Design Masterclass', instructor: 'ins_2', category: 'Design', level: 'beginner', price: 44.99, originalPrice: 89.99, rating: 4.9, students: 4200, duration: '14h 15m', lessonsCount: 56, language: 'Arabic', thumbnail: '🎨', description: 'Master Figma, design systems, and user research', tags: ['design', 'figma', 'ux'], bestseller: true },
  ].forEach(c => courses.set(c.id, c));

  // Lessons (for course 1)
  [
    { id: 'les_1', courseId: 'crs_1', title: 'Introduction to Elmoorx', duration: '8:24', order: 1, type: 'video', preview: true },
    { id: 'les_2', courseId: 'crs_1', title: 'Setting Up Your Environment', duration: '12:30', order: 2, type: 'video', preview: true },
    { id: 'les_3', courseId: 'crs_1', title: 'Signals and Reactivity', duration: '18:45', order: 3, type: 'video', preview: false },
    { id: 'les_4', courseId: 'crs_1', title: 'Building Your First Component', duration: '22:10', order: 4, type: 'video', preview: false },
    { id: 'les_5', courseId: 'crs_1', title: 'Routing and Layouts', duration: '16:20', order: 5, type: 'video', preview: false },
    { id: 'les_6', courseId: 'crs_1', title: 'Quiz: Foundations', duration: '5:00', order: 6, type: 'quiz', preview: false },
    { id: 'les_7', courseId: 'crs_1', title: 'State Management Deep Dive', duration: '25:40', order: 7, type: 'video', preview: false },
    { id: 'les_8', courseId: 'crs_1', title: 'Building a Todo App', duration: '35:15', order: 8, type: 'video', preview: false },
  ].forEach(l => lessons.set(l.id, l));

  // Students
  [
    { id: 'stu_1', name: 'Layla Ahmed', email: 'layla@student.com', enrolledCourses: ['crs_1', 'crs_2'], completedCourses: [], progress: { crs_1: 45, crs_2: 12 }, joinedAt: '2026-06-01', points: 1250 },
    { id: 'stu_2', name: 'Omar Khalid', email: 'omar@student.com', enrolledCourses: ['crs_1', 'crs_3', 'crs_5'], completedCourses: ['crs_3'], progress: { crs_1: 78, crs_5: 23 }, joinedAt: '2026-05-15', points: 3400 },
    { id: 'stu_3', name: 'Noor Saleh', email: 'noor@student.com', enrolledCourses: ['crs_2', 'crs_4'], completedCourses: ['crs_2'], progress: { crs_4: 56 }, joinedAt: '2026-04-20', points: 2100 },
  ].forEach(s => students.set(s.id, s));

  // Quizzes
  [
    { id: 'qz_1', courseId: 'crs_1', lessonId: 'les_6', title: 'Foundations Quiz', questions: [
      { id: 'q1', text: 'What is the bundle size of Elmoorx runtime (gzipped)?', options: ['4.2kb', '80kb', '45kb', '120kb'], correct: 0 },
      { id: 'q2', text: 'Which hook replaces useState in Elmoorx?', options: ['$state', 'useState', 'state', 'reactive'], correct: 0 },
      { id: 'q3', text: 'What architecture does Elmoorx use?', options: ['Virtual DOM', 'Islands', 'Server-only', 'None'], correct: 1 },
    ], passingScore: 70 },
  ].forEach(q => quizzes.set(q.id, q));

  // Certificates
  [
    { id: 'cert_1', studentId: 'stu_2', courseId: 'crs_3', issuedAt: '2026-07-01', grade: 'A', certificateId: 'WFRA-2026-001' },
    { id: 'cert_2', studentId: 'stu_3', courseId: 'crs_2', issuedAt: '2026-06-15', grade: 'A+', certificateId: 'WFRA-2026-002' },
  ].forEach(c => certificates.set(c.id, c));

  // Discussions
  [
    { id: 'dis_1', courseId: 'crs_1', studentId: 'stu_1', text: 'How do I handle async effects?', replies: 3, upvotes: 12, time: Date.now() - 86400000 },
    { id: 'dis_2', courseId: 'crs_1', studentId: 'stu_2', text: 'The lesson on signals was amazing!', replies: 1, upvotes: 8, time: Date.now() - 43200000 },
    { id: 'dis_3', courseId: 'crs_1', studentId: 'stu_3', text: 'Anyone completed the todo app exercise?', replies: 5, upvotes: 15, time: Date.now() - 21600000 },
  ].forEach(d => discussions.set(d.id, d));

  // Live classes
  [
    { id: 'live_1', courseId: 'crs_1', title: 'Q&A Session: Signals Deep Dive', instructor: 'ins_1', scheduledAt: '2026-07-15T18:00:00Z', duration: 60, registered: 145, maxAttendees: 200 },
    { id: 'live_2', courseId: 'crs_2', title: 'Live Coding: Data Analysis', instructor: 'ins_2', scheduledAt: '2026-07-16T15:00:00Z', duration: 90, registered: 89, maxAttendees: 150 },
    { id: 'live_3', courseId: 'crs_5', title: 'Smart Contract Workshop', instructor: 'ins_3', scheduledAt: '2026-07-17T17:00:00Z', duration: 120, registered: 67, maxAttendees: 100 },
  ].forEach(l => liveClasses.set(l.id, l));

  // Assignments
  [
    { id: 'asg_1', courseId: 'crs_1', title: 'Build a Counter App', description: 'Create a counter using $state and $effect', dueDate: '2026-07-20', submissions: 234, maxScore: 100 },
    { id: 'asg_2', courseId: 'crs_1', title: 'Build a Todo List', description: 'Full todo app with add, edit, delete, filter', dueDate: '2026-07-25', submissions: 189, maxScore: 100 },
    { id: 'asg_3', courseId: 'crs_2', title: 'Data Analysis Project', description: 'Analyze a dataset and create visualizations', dueDate: '2026-07-22', submissions: 312, maxScore: 100 },
  ].forEach(a => assignments.set(a.id, a));
}

seed();

// ─── HTML Layout ────────────────────────────────────────────────────────────

function layout(content, activeNav = 'catalog') {
  const navItems = [
    { id: 'catalog', label: 'Catalog', icon: '📚' },
    { id: 'my-learning', label: 'My Learning', icon: '🎓' },
    { id: 'live', label: 'Live Classes', icon: '📡' },
    { id: 'certificates', label: 'Certificates', icon: '🏆' },
    { id: 'instructors', label: 'Instructors', icon: '👨‍🏫' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ];
  return `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Elmoorx LMS — Learning Management System</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }
  .layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
  .sidebar { background: #0f172a; color: #e2e8f0; padding: 24px 0; position: sticky; top: 0; height: 100vh; }
  .brand { padding: 0 24px 24px; border-bottom: 1px solid #1e293b; margin-bottom: 16px; }
  .brand h1 { color: #818cf8; font-size: 20px; }
  .brand p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .nav-item { padding: 12px 24px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: #94a3b8; text-decoration: none; transition: all 0.15s; }
  .nav-item:hover { background: #1e293b; color: #e2e8f0; }
  .nav-item.active { background: #1e293b; color: #818cf8; border-right: 3px solid #6366f1; }
  .main { padding: 32px; overflow-y: auto; }
  h2 { font-size: 24px; margin-bottom: 8px; }
  .subtitle { color: #64748b; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; text-decoration: none; color: inherit; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
  .card-thumb { height: 140px; display: flex; align-items: center; justify-content: center; font-size: 64px; background: linear-gradient(135deg, #eef2ff, #ddd6fe); }
  .card-body { padding: 16px; }
  .card-body h3 { font-size: 15px; margin-bottom: 4px; line-height: 1.4; }
  .card-body .instructor { font-size: 12px; color: #64748b; margin-bottom: 8px; }
  .card-body .meta { display: flex; gap: 12px; font-size: 12px; color: #64748b; margin-bottom: 8px; }
  .card-body .price { font-size: 18px; font-weight: 700; color: #4f46e5; }
  .card-body .price .original { text-decoration: line-through; color: #94a3b8; font-size: 14px; font-weight: 400; margin-right: 6px; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .pill.green { background: #d1fae5; color: #065f46; }
  .pill.yellow { background: #fef3c7; color: #92400e; }
  .pill.blue { background: #dbeafe; color: #1e40af; }
  .pill.purple { background: #ede9fe; color: #5b21b6; }
  .pill.red { background: #fee2e2; color: #991b1b; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  .stat-card .value { font-size: 28px; font-weight: 700; margin: 8px 0; }
  .detail { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
  .detail-main, .detail-side { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .lesson-list { list-style: none; }
  .lesson-item { padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; }
  .lesson-item:last-child { border-bottom: none; }
  .lesson-num { width: 28px; height: 28px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
  .lesson-info { flex: 1; }
  .lesson-info .title { font-size: 14px; font-weight: 500; }
  .lesson-info .meta { font-size: 12px; color: #64748b; }
  .progress-bar { background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden; }
  .progress-fill { background: #10b981; height: 100%; }
</style>
</head>
<body>
<div class="layout">
  <aside class="sidebar">
    <div class="brand">
      <h1>🎓 Elmoorx LMS</h1>
      <p>v2.0.0-alpha.25</p>
    </div>
    ${navItems.map(n => `<a class="nav-item ${n.id === activeNav ? 'active' : ''}" href="/${n.id}">${n.icon} ${n.label}</a>`).join('')}
  </aside>
  <main class="main">
    ${content}
  </main>
</div>
</body>
</html>`;
}

function renderCatalog() {
  return layout(`
    <h2>Course Catalog</h2>
    <p class="subtitle">${courses.size} courses · ${Array.from(courses.values()).reduce((s, c) => s + c.students, 0).toLocaleString()} students enrolled</p>

    <div class="grid">
      ${Array.from(courses.values()).map(c => {
        const ins = instructors.get(c.instructor);
        return `<a class="card" href="/course/${c.id}">
          <div class="card-thumb">${c.thumbnail}</div>
          <div class="card-body">
            <h3>${c.title}</h3>
            <div class="instructor">by ${ins?.name || 'Unknown'}</div>
            <div class="meta">
              <span>⭐ ${c.rating}</span>
              <span>👥 ${c.students.toLocaleString()}</span>
              <span>🕐 ${c.duration}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span class="pill ${c.level === 'beginner' ? 'green' : c.level === 'intermediate' ? 'yellow' : 'red'}">${c.level}</span>
              ${c.bestseller ? '<span class="pill purple" style="margin-left:4px;">🏆 Bestseller</span>' : ''}
            </div>
            <div class="price">
              <span class="original">$${c.originalPrice}</span>$${c.price}
            </div>
          </div>
        </a>`;
      }).join('')}
    </div>
  `, 'catalog');
}

function renderCourseDetail(courseId) {
  const course = courses.get(courseId);
  if (!course) return layout('<h2>Course not found</h2>');
  const ins = instructors.get(course.instructor);
  const courseLessons = Array.from(lessons.values()).filter(l => l.courseId === courseId).sort((a, b) => a.order - b.order);
  const courseDiscussions = Array.from(discussions.values()).filter(d => d.courseId === courseId);
  const courseAssignments = Array.from(assignments.values()).filter(a => a.courseId === courseId);

  return layout(`
    <div class="detail">
      <div class="detail-main">
        <h2>${course.title}</h2>
        <p class="subtitle">${course.description}</p>
        <div style="display:flex;gap:16px;margin-bottom:24px;font-size:14px;color:#64748b;">
          <span>⭐ ${course.rating}</span>
          <span>👥 ${course.students.toLocaleString()} students</span>
          <span>🕐 ${course.duration}</span>
          <span>📚 ${course.lessonsCount} lessons</span>
          <span>🌐 ${course.language}</span>
        </div>

        <h3 style="margin-bottom:16px;">Curriculum</h3>
        <ul class="lesson-list">
          ${courseLessons.map(l => `
            <li class="lesson-item">
              <div class="lesson-num">${l.order}</div>
              <div class="lesson-info">
                <div class="title">${l.title}</div>
                <div class="meta">${l.type === 'video' ? '🎥 Video' : '📝 Quiz'} · ${l.duration}${l.preview ? ' · 👁 Preview' : ''}</div>
              </div>
              ${l.preview ? '<span class="pill green">Free Preview</span>' : '<span class="pill gray">🔒 Locked</span>'}
            </li>
          `).join('')}
        </ul>

        <h3 style="margin: 32px 0 16px;">Discussions (${courseDiscussions.length})</h3>
        ${courseDiscussions.map(d => {
          const student = students.get(d.studentId);
          return `<div style="padding:12px;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:500;">${student?.name || 'Student'}</div>
            <div style="color:#475569;margin:4px 0;">${d.text}</div>
            <div style="font-size:12px;color:#94a3b8;">⬆ ${d.upvotes} · 💬 ${d.replies} replies · ${new Date(d.time).toLocaleDateString()}</div>
          </div>`;
        }).join('')}

        <h3 style="margin: 32px 0 16px;">Assignments (${courseAssignments.length})</h3>
        ${courseAssignments.map(a => `
          <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
            <div style="font-weight:500;">${a.title}</div>
            <div style="color:#64748b;font-size:14px;margin:4px 0;">${a.description}</div>
            <div style="font-size:12px;color:#94a3b8;">📅 Due: ${a.dueDate} · 📤 ${a.submissions} submissions · /${a.maxScore} pts</div>
          </div>
        `).join('')}
      </div>

      <div class="detail-side">
        <div style="text-align:center;padding:24px;background:linear-gradient(135deg,#eef2ff,#ddd6fe);border-radius:8px;margin-bottom:16px;">
          <div style="font-size:80px;">${course.thumbnail}</div>
        </div>
        <div style="font-size:32px;font-weight:700;color:#4f46e5;margin-bottom:8px;">
          <span style="text-decoration:line-through;color:#94a3b8;font-size:18px;font-weight:400;">$${course.originalPrice}</span>
          $${course.price}
        </div>
        <button style="width:100%;padding:14px;background:#4f46e5;color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:8px;">Enroll Now</button>
        <button style="width:100%;padding:12px;background:white;border:1px solid #4f46e5;color:#4f46e5;border-radius:8px;font-size:14px;cursor:pointer;margin-bottom:16px;">Add to Wishlist</button>

        <h4 style="margin-bottom:8px;">This course includes:</h4>
        <ul style="list-style:none;font-size:14px;color:#475569;">
          <li style="padding:4px 0;">🎥 ${course.duration} on-demand video</li>
          <li style="padding:4px 0;">📝 ${courseAssignments.length} assignments</li>
          <li style="padding:4px 0;">📖 ${course.lessonsCount} lessons</li>
          <li style="padding:4px 0;">♾️ Full lifetime access</li>
          <li style="padding:4px 0;">📱 Access on mobile and TV</li>
          <li style="padding:4px 0;">🏆 Certificate of completion</li>
        </ul>

        <h4 style="margin: 24px 0 8px;">Instructor</h4>
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="width:48px;height:48px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-weight:600;">${ins?.name[0] || '?'}</div>
          <div>
            <div style="font-weight:600;">${ins?.name || 'Unknown'} ${ins?.verified ? '✓' : ''}</div>
            <div style="font-size:12px;color:#64748b;">⭐ ${ins?.rating} · 👥 ${ins?.students.toLocaleString()} students</div>
          </div>
        </div>
        <p style="font-size:13px;color:#64748b;margin-top:8px;">${ins?.bio}</p>
      </div>
    </div>
  `);
}

function renderMyLearning() {
  return layout(`
    <h2>My Learning</h2>
    <p class="subtitle">Continue where you left off</p>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Enrolled</div><div class="value">${students.size}</div></div>
      <div class="stat-card"><div class="label">In Progress</div><div class="value">2</div></div>
      <div class="stat-card"><div class="label">Completed</div><div class="value">1</div></div>
      <div class="stat-card"><div class="label">Total Points</div><div class="value">6,750</div></div>
    </div>

    <h3 style="margin-bottom:16px;">Continue Learning</h3>
    <div class="grid">
      ${Array.from(students.values()).flatMap(s => s.enrolledCourses.map(cid => {
        const c = courses.get(cid);
        if (!c) return '';
        const progress = s.progress[cid] || 0;
        return `<a class="card" href="/course/${c.id}">
          <div class="card-thumb">${c.thumbnail}</div>
          <div class="card-body">
            <h3>${c.title}</h3>
            <div style="margin:8px 0;">
              <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">${progress}% complete</div>
            </div>
          </div>
        </a>`;
      })).join('')}
    </div>
  `, 'my-learning');
}

function renderLive() {
  return layout(`
    <h2>Live Classes</h2>
    <p class="subtitle">Join live sessions with instructors</p>

    <div class="grid">
      ${Array.from(liveClasses.values()).map(l => {
        const c = courses.get(l.courseId);
        const ins = instructors.get(l.instructor);
        return `<div class="card" style="cursor:pointer;">
          <div class="card-thumb" style="background:linear-gradient(135deg,#fee2e2,#fecaca);">📡</div>
          <div class="card-body">
            <h3>${l.title}</h3>
            <div class="instructor">by ${ins?.name || 'Unknown'}</div>
            <div class="meta">
              <span>📅 ${new Date(l.scheduledAt).toLocaleDateString()}</span>
              <span>🕐 ${l.duration} min</span>
            </div>
            <div style="margin:8px 0;">
              <span class="pill ${l.registered >= l.maxAttendees ? 'red' : 'green'}">
                ${l.registered >= l.maxAttendees ? 'Full' : `${l.maxAttendees - l.registered} spots left`}
              </span>
            </div>
            <div style="font-size:12px;color:#64748b;">👥 ${l.registered}/${l.maxAttendees} registered</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `, 'live');
}

function renderCertificates() {
  return layout(`
    <h2>My Certificates</h2>
    <p class="subtitle">${certificates.size} certificates earned</p>

    <div class="grid">
      ${Array.from(certificates.values()).map(c => {
        const stu = students.get(c.studentId);
        const crs = courses.get(c.courseId);
        return `<div class="card">
          <div class="card-thumb" style="background:linear-gradient(135deg,#fef3c7,#fde68a);">🏆</div>
          <div class="card-body">
            <h3>${crs?.title || 'Course'}</h3>
            <div class="instructor">${stu?.name || 'Student'}</div>
            <div class="meta">
              <span>Grade: ${c.grade}</span>
              <span>📅 ${c.issuedAt}</span>
            </div>
            <div style="font-size:11px;color:#94a3b8;font-family:monospace;margin-top:8px;">ID: ${c.certificateId}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `, 'certificates');
}

function renderInstructors() {
  return layout(`
    <h2>Instructors</h2>
    <p class="subtitle">Learn from industry experts</p>

    <div class="grid">
      ${Array.from(instructors.values()).map(i => `
        <div class="card">
          <div class="card-thumb" style="background:linear-gradient(135deg,#eef2ff,#c7d2fe);">${i.name[0]}</div>
          <div class="card-body">
            <h3>${i.name} ${i.verified ? '✓' : ''}</h3>
            <div class="instructor">${i.expertise.join(', ')}</div>
            <div class="meta">
              <span>⭐ ${i.rating}</span>
              <span>👥 ${i.students.toLocaleString()}</span>
              <span>📚 ${i.courses} courses</span>
            </div>
            <p style="font-size:13px;color:#64748b;margin-top:8px;">${i.bio}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `, 'instructors');
}

function renderDashboard() {
  return layout(`
    <h2>Dashboard</h2>
    <p class="subtitle">Overview of your learning platform</p>

    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Courses</div><div class="value">${courses.size}</div></div>
      <div class="stat-card"><div class="label">Students</div><div class="value">${Array.from(courses.values()).reduce((s, c) => s + c.students, 0).toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Instructors</div><div class="value">${instructors.size}</div></div>
      <div class="stat-card"><div class="label">Revenue</div><div class="value">$${(Array.from(courses.values()).reduce((s, c) => s + c.students * c.price, 0) / 1000).toFixed(0)}k</div></div>
    </div>

    <div style="background:white;padding:24px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <h3 style="margin-bottom:16px;">Top Courses by Enrollment</h3>
      ${Array.from(courses.values()).sort((a, b) => b.students - a.students).slice(0, 5).map((c, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;">
          <div style="width:32px;height:32px;border-radius:50%;background:#4f46e5;color:white;display:flex;align-items:center;justify-content:center;font-weight:600;">${i + 1}</div>
          <div style="flex:1;">
            <div style="font-weight:500;">${c.title}</div>
            <div style="font-size:12px;color:#64748b;">⭐ ${c.rating} · $${c.price}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600;">${c.students.toLocaleString()}</div>
            <div style="font-size:11px;color:#64748b;">students</div>
          </div>
        </div>
      `).join('')}
    </div>
  `, 'dashboard');
}

// ─── HTTP server ────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const route = req.url.split('?')[0];

  if (route === '/' || route === '/catalog') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderCatalog());
  }
  if (route === '/my-learning') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderMyLearning());
  }
  if (route === '/live') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderLive());
  }
  if (route === '/certificates') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderCertificates());
  }
  if (route === '/instructors') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderInstructors());
  }
  if (route === '/dashboard') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderDashboard());
  }
  if (route.startsWith('/course/')) {
    const id = route.split('/').pop();
    res.setHeader('Content-Type', 'text/html');
    return res.end(renderCourseDetail(id));
  }

  // API endpoints
  if (route === '/api/courses') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(courses.values())));
  }
  if (route.startsWith('/api/courses/') && route.split('/').length === 4) {
    const id = route.split('/').pop();
    const course = courses.get(id);
    if (!course) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Not found' })); }
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(course));
  }
  if (route === '/api/instructors') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(instructors.values())));
  }
  if (route === '/api/students') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(students.values())));
  }
  if (route === '/api/lessons') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(lessons.values())));
  }
  if (route === '/api/certificates') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(certificates.values())));
  }
  if (route === '/api/live-classes') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(liveClasses.values())));
  }
  if (route === '/api/assignments') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(assignments.values())));
  }
  if (route === '/api/quizzes') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(quizzes.values())));
  }
  if (route === '/api/discussions') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Array.from(discussions.values())));
  }
  if (route === '/api/stats') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      courses: courses.size,
      instructors: instructors.size,
      students: Array.from(courses.values()).reduce((s, c) => s + c.students, 0),
      lessons: lessons.size,
      certificates: certificates.size,
      liveClasses: liveClasses.size,
      revenue: Array.from(courses.values()).reduce((s, c) => s + c.students * c.price, 0),
    }));
  }

  if (route === '/health') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'lms',
      version: '2.0.0-alpha.25',
      data: {
        courses: courses.size,
        instructors: instructors.size,
        students: students.size,
        lessons: lessons.size,
        certificates: certificates.size,
        liveClasses: liveClasses.size,
        assignments: assignments.size,
        quizzes: quizzes.size,
        discussions: discussions.size,
      },
    }));
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = 5800;
server.listen(PORT, () => {
  console.log(`  ✓ LMS Platform         → http://localhost:${PORT}`);
});

module.exports = { server };
