const { Pool } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');
const localStore = require('./localStore');

let pool;
let isPgAvailable = false;
let connectionChecked = false;

// The in-memory store ships with well-known demo credentials, so it must never
// back a production deployment.
const localStoreEnabled = !config.isProduction;

if (localStoreEnabled) {
  // Initialize local store immediately for instant availability
  localStore.init().catch(err => logger.error('Failed to init local store', { error: err.message }));
}

try {
  let poolConfig;
  if (config.database.socketPath) {
    poolConfig = {
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      host: config.database.socketPath,
      max: 20,
      connectionTimeoutMillis: 2000,
    };
  } else if (config.database.url) {
    poolConfig = {
      connectionString: config.database.url,
      ssl: config.database.ssl,
      max: 20,
      connectionTimeoutMillis: 2000,
    };
  } else {
    poolConfig = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: 20,
      connectionTimeoutMillis: 2000,
    };
  }

  pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    // Suppress unhandled idle pool errors in local dev
    isPgAvailable = false;
  });
} catch (e) {
  isPgAvailable = false;
}

/**
 * Execute SQL Query with automated PostgreSQL / Relational Fallback
 */
const query = async (text, params = []) => {
  const normalizedSql = text.trim();

  // Try PostgreSQL if available or not yet checked
  if (pool) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      isPgAvailable = true;
      connectionChecked = true;
      logger.debug('Executed query on PostgreSQL', { duration: Date.now() - start, rows: res.rowCount });
      return res;
    } catch (error) {
      if (!localStoreEnabled) {
        throw error;
      }
      if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        isPgAvailable = false;
        connectionChecked = true;
        logger.debug('PostgreSQL server not detected locally. Routing to Local Relational Engine.');
      } else if (isPgAvailable) {
        // If it's a real SQL syntax/constraint error from PostgreSQL, rethrow
        throw error;
      }
    }
  }

  // Local Relational Storage Engine Execution
  if (!localStoreEnabled) {
    throw new Error('Database is unavailable and the local storage engine is disabled in production.');
  }
  await localStore.init();
  return executeLocalQuery(normalizedSql, params);
};

/**
 * Executes relational queries on local in-memory store
 */
function executeLocalQuery(sql, params) {
  const lower = sql.toLowerCase();

  // 1. Health Probe
  if (lower.startsWith('select 1 as is_healthy')) {
    return {
      rowCount: 1,
      rows: [{ is_healthy: 1, server_time: new Date() }],
    };
  }

  // Collision check queries
  if (lower.includes('from students') && lower.includes('lower(roll_no) = lower($1)')) {
    const rollNo = params[0];
    const s = localStore.students.find(stu => stu.roll_no.toLowerCase() === String(rollNo).toLowerCase());
    return s ? { rowCount: 1, rows: [{ id: s.id, roll_no: s.roll_no }] } : { rowCount: 0, rows: [] };
  }

  // 2. Auth: SELECT user by email
  if (lower.includes('from users') && (lower.includes('lower(u.email) = lower($1)') || lower.includes('lower(email) = lower($1)'))) {
    const email = params[0];
    const user = localStore.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return { rowCount: 0, rows: [] };

    const fac = localStore.faculty.find(f => f.user_id === user.id);
    const stu = localStore.students.find(s => s.user_id === user.id);

    return {
      rowCount: 1,
      rows: [{
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.password_hash,
        role: user.role,
        status: user.status,
        must_change_password: !!user.must_change_password,
        faculty_id: fac ? fac.id : null,
        faculty_department: fac ? fac.department : null,
        faculty_phone: fac ? fac.phone : null,
        designation: fac ? fac.designation : null,
        student_id: stu ? stu.id : null,
        roll_no: stu ? stu.roll_no : null,
        student_department: stu ? stu.department : null,
        student_phone: stu ? stu.phone : null,
        semester: stu ? stu.semester : null,
      }],
    };
  }

  // 3. Auth Token Middleware & Password checks: SELECT user by id
  if (lower.includes('from users') && (lower.includes('where u.id = $1') || lower.includes('where id = $1'))) {
    const id = params[0];
    const user = localStore.users.find(u => u.id === id);
    if (!user) return { rowCount: 0, rows: [] };

    const fac = localStore.faculty.find(f => f.user_id === user.id);
    const stu = localStore.students.find(s => s.user_id === user.id);

    return {
      rowCount: 1,
      rows: [{
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.password_hash,
        role: user.role,
        status: user.status,
        must_change_password: !!user.must_change_password,
        faculty_id: fac ? fac.id : null,
        faculty_department: fac ? fac.department : null,
        faculty_phone: fac ? fac.phone : null,
        designation: fac ? fac.designation : null,
        student_id: stu ? stu.id : null,
        roll_no: stu ? stu.roll_no : null,
        student_department: stu ? stu.department : null,
        student_phone: stu ? stu.phone : null,
        semester: stu ? stu.semester : null,
      }],
    };
  }

  // 4. Dashboard KPIs - Admin
  if (lower === 'select count(*) as count from students') {
    return { rowCount: 1, rows: [{ count: localStore.students.length }] };
  }
  if (lower === 'select count(*) as count from faculty') {
    return { rowCount: 1, rows: [{ count: localStore.faculty.length }] };
  }
  if (lower === 'select count(*) as count from courses') {
    return { rowCount: 1, rows: [{ count: localStore.courses.length }] };
  }
  if (lower.includes("from enrollments where status = 'active'")) {
    return { rowCount: 1, rows: [{ count: localStore.enrollments.filter(e => e.status === 'ACTIVE').length }] };
  }
  if (lower.includes('from attendance') && lower.includes('overall_rate')) {
    const total = localStore.attendance.length;
    const present = localStore.attendance.filter(a => a.status === 'PRESENT').length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
    return { rowCount: 1, rows: [{ total_records: total, present_count: present, overall_rate: rate }] };
  }
  if (lower.includes('from audit_logs')) {
    if (lower.includes('count(a.id)')) {
      return { rowCount: 1, rows: [{ total: localStore.auditLogs.length }] };
    }
    const sorted = [...localStore.auditLogs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const rows = sorted.map(log => {
      const u = localStore.users.find(usr => usr.id === log.actor_id);
      return {
        id: log.id,
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id,
        details: log.details,
        ip_address: log.ip_address,
        created_at: log.created_at,
        actor_id: log.actor_id,
        actor_name: u ? u.name : 'System Administrator',
        actor_email: u ? u.email : 'admin@university.edu',
        actor_role: u ? u.role : 'ADMIN',
      };
    });
    return { rowCount: rows.length, rows: rows.slice(0, 15) };
  }
  if (lower.includes('group by department') && lower.includes('from students')) {
    const depts = {};
    localStore.students.forEach(s => {
      depts[s.department] = (depts[s.department] || 0) + 1;
    });
    const rows = Object.entries(depts).map(([department, student_count]) => ({ department, student_count }));
    return { rowCount: rows.length, rows };
  }

  // 5. Dashboard KPIs - Faculty
  if (lower.includes('from courses c') && lower.includes('where c.faculty_id = $1')) {
    const facId = params[0];
    const courses = localStore.courses.filter(c => c.faculty_id === facId);
    const rows = courses.map(c => ({
      ...c,
      enrolled_students: localStore.enrollments.filter(e => e.course_id === c.id && e.status === 'ACTIVE').length,
    }));
    return { rowCount: rows.length, rows };
  }
  if (lower.includes('count(distinct e.student_id)') && lower.includes('where c.faculty_id = $1')) {
    const facId = params[0];
    const facCourses = localStore.courses.filter(c => c.faculty_id === facId).map(c => c.id);
    const studentIds = new Set(localStore.enrollments.filter(e => facCourses.includes(e.course_id)).map(e => e.student_id));
    return { rowCount: 1, rows: [{ count: studentIds.size }] };
  }

  // 6. Dashboard KPIs - Student
  if (lower.includes('from enrollments e') && lower.includes('where e.student_id = $1')) {
    const stuId = params[0];
    const myEnrollments = localStore.enrollments.filter(e => e.student_id === stuId && e.status === 'ACTIVE');
    const myEnrollIds = myEnrollments.map(e => e.id);

    if (lower.includes('join courses c') && !lower.includes('attendance a')) {
      const rows = myEnrollments.map(e => {
        const c = localStore.courses.find(crs => crs.id === e.course_id);
        const f = c?.faculty_id ? localStore.faculty.find(fac => fac.id === c.faculty_id) : null;
        const fu = f ? localStore.users.find(u => u.id === f.user_id) : null;
        return {
          id: c.id,
          enrollment_id: e.id,
          academic_year: e.academic_year || '2024-2025',
          enrollment_status: e.status || 'ACTIVE',
          course_id: c.id,
          course_code: c.code,
          code: c.code,
          course_name: c.name,
          name: c.name,
          credits: c.credits,
          department: c.department,
          faculty_name: fu ? fu.name : 'Unassigned',
        };
      });
      return { rowCount: rows.length, rows };
    }

    if (lower.includes('group by c.id, c.code, c.name') || lower.includes('group by c.code, c.name')) {
      const rows = myEnrollments.map(e => {
        const crs = localStore.courses.find(c => c.id === e.course_id);
        const atts = localStore.attendance.filter(a => a.enrollment_id === e.id);
        const pres = atts.filter(a => a.status === 'PRESENT').length;
        const pct = atts.length > 0 ? ((pres / atts.length) * 100).toFixed(1) : '100.0';
        return {
          course_code: crs ? crs.code : '',
          course_name: crs ? crs.name : '',
          total_classes: atts.length,
          attended_classes: pres,
          percentage: pct,
        };
      });
      return { rowCount: rows.length, rows };
    }

    if (lower.includes('count(a.id) as total_classes')) {
      const atts = localStore.attendance.filter(a => myEnrollIds.includes(a.enrollment_id));
      const pres = atts.filter(a => a.status === 'PRESENT').length;
      const pct = atts.length > 0 ? ((pres / atts.length) * 100).toFixed(1) : '100.0';
      return { rowCount: 1, rows: [{ total_classes: atts.length, attended_classes: pres, percentage: pct }] };
    }

    if (lower.includes('from marks m')) {
      const myMarks = localStore.marks.filter(m => myEnrollIds.includes(m.enrollment_id));
      const sorted = [...myMarks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const rows = sorted.map(m => {
        const enr = myEnrollments.find(e => e.id === m.enrollment_id);
        const crs = enr ? localStore.courses.find(c => c.id === enr.course_id) : null;
        return {
          id: m.id,
          assessment: m.assessment,
          score: m.score,
          max_score: m.max_score,
          course_code: crs ? crs.code : '',
          course_name: crs ? crs.name : '',
        };
      });
      return { rowCount: rows.length, rows };
    }
  }

  // Student Attendance Records API
  if (lower.includes('from attendance a') && lower.includes('where e.student_id = $1')) {
    const [stuId, crsId] = params;
    const myEnrollments = localStore.enrollments.filter(e => e.student_id === stuId && (!crsId || e.course_id === crsId));
    const myEnrollIds = myEnrollments.map(e => e.id);
    const myAtts = localStore.attendance.filter(a => myEnrollIds.includes(a.enrollment_id));
    const sorted = [...myAtts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const rows = sorted.map(att => {
      const enr = myEnrollments.find(e => e.id === att.enrollment_id);
      const crs = enr ? localStore.courses.find(c => c.id === enr.course_id) : null;
      const marker = att.marked_by ? localStore.users.find(u => u.id === att.marked_by) : null;
      return {
        id: att.id,
        date: att.date,
        status: att.status,
        created_at: att.created_at,
        course_id: crs ? crs.id : null,
        course_code: crs ? crs.code : '',
        course_name: crs ? crs.name : '',
        marked_by_name: marker ? marker.name : 'Faculty Lead',
      };
    });
    return { rowCount: rows.length, rows };
  }

  // Student Marks Records API
  if (lower.includes('from marks m') && lower.includes('where e.student_id = $1')) {
    const [stuId, crsId] = params;
    const myEnrollments = localStore.enrollments.filter(e => e.student_id === stuId && (!crsId || e.course_id === crsId));
    const myEnrollIds = myEnrollments.map(e => e.id);
    const myMarks = localStore.marks.filter(m => myEnrollIds.includes(m.enrollment_id));
    const rows = myMarks.map(mk => {
      const enr = myEnrollments.find(e => e.id === mk.enrollment_id);
      const crs = enr ? localStore.courses.find(c => c.id === enr.course_id) : null;
      const enterer = mk.entered_by ? localStore.users.find(u => u.id === mk.entered_by) : null;
      const pct = mk.max_score > 0 ? ((mk.score / mk.max_score) * 100).toFixed(1) : '0.0';
      return {
        id: mk.id,
        assessment: mk.assessment,
        score: mk.score,
        max_score: mk.max_score,
        percentage: pct,
        created_at: mk.created_at,
        updated_at: mk.updated_at,
        course_id: crs ? crs.id : null,
        course_code: crs ? crs.code : '',
        course_name: crs ? crs.name : '',
        credits: crs ? crs.credits : 3,
        entered_by_name: enterer ? enterer.name : 'Faculty Lead',
      };
    });
    return { rowCount: rows.length, rows };
  }

  // Course Attendance Summary for Course Header
  if (lower.includes('count(a.id) as total_sessions') && lower.includes('where e.course_id = $1')) {
    const courseId = params[0];
    const enrs = localStore.enrollments.filter(e => e.course_id === courseId && e.status === 'ACTIVE');
    const rows = enrs.map(e => {
      const s = localStore.students.find(stu => stu.id === e.student_id);
      const u = s ? localStore.users.find(usr => usr.id === s.user_id) : null;
      const atts = localStore.attendance.filter(a => a.enrollment_id === e.id);
      const pres = atts.filter(a => a.status === 'PRESENT').length;
      const abs = atts.filter(a => a.status === 'ABSENT').length;
      const late = atts.filter(a => a.status === 'LATE').length;
      const pct = atts.length > 0 ? ((pres / atts.length) * 100).toFixed(1) : '100.0';
      return {
        roll_no: s ? s.roll_no : '',
        student_name: u ? u.name : '',
        total_sessions: atts.length,
        present_count: pres,
        absent_count: abs,
        late_count: late,
        attendance_percentage: pct,
      };
    });
    return { rowCount: rows.length, rows };
  }

  // Single student lookup by id
  if (lower.includes('from students') && (lower.includes('where id = $1') || lower.includes('where s.id = $1'))) {
    const id = params[0];
    const s = localStore.students.find(stu => stu.id === id);
    if (!s) return { rowCount: 0, rows: [] };
    const u = localStore.users.find(usr => usr.id === s.user_id);
    return {
      rowCount: 1,
      rows: [{
        id: s.id,
        user_id: s.user_id,
        phone: s.phone || null,
        roll_no: s.roll_no,
        department: s.department,
        semester: s.semester,
        admission_year: s.admission_year,
        created_at: s.created_at,
        updated_at: s.updated_at,
        name: u ? u.name : 'Unknown',
        email: u ? u.email : '',
        status: u ? u.status : 'ACTIVE',
        must_change_password: !!u?.must_change_password,
      }],
    };
  }

  // 6.5 Reports: Top Performing Students
  if (lower.includes('order by aggregate_score desc') || lower.includes('top performing students') || (lower.includes('from students s') && lower.includes('aggregate_score'))) {
    const rows = localStore.students.map((s, idx) => {
      const u = localStore.users.find(usr => usr.id === s.user_id);
      
      const stuEnrs = localStore.enrollments.filter(e => e.student_id === s.id && e.status === 'ACTIVE');
      const stuEnrIds = stuEnrs.map(e => e.id);
      const stuMarks = localStore.marks.filter(m => stuEnrIds.includes(m.enrollment_id));
      let avgScore = 88.5 - (idx * 3.2);
      if (stuMarks.length > 0) {
        const totalPct = stuMarks.reduce((acc, m) => acc + ((m.score / m.max_score) * 100), 0);
        avgScore = Math.round((totalPct / stuMarks.length) * 10) / 10;
      }
      
      const stuAtts = localStore.attendance.filter(a => stuEnrIds.includes(a.enrollment_id));
      let attRate = 94.0 - (idx * 2.5);
      if (stuAtts.length > 0) {
        const presentCount = stuAtts.filter(a => a.status === 'PRESENT').length;
        attRate = Math.round((presentCount / stuAtts.length) * 1000) / 10;
      }

      return {
        id: s.id,
        roll_no: s.roll_no,
        student_name: u?.name || 'Student',
        name: u?.name || 'Student',
        department: s.department,
        semester: s.semester,
        aggregate_score: avgScore,
        attendance_rate: `${attRate}%`,
      };
    }).sort((a, b) => b.aggregate_score - a.aggregate_score);

    return { rowCount: rows.length, rows };
  }

  // 7. Student Directory & Search
  if (lower.includes('from students s') && lower.includes('join users u on u.id = s.user_id')) {
    if (lower.startsWith('select count(s.id) as total')) {
      return { rowCount: 1, rows: [{ total: localStore.students.length }] };
    }

    if (lower.includes('where s.id = $1')) {
      const id = params[0];
      const s = localStore.students.find(stu => stu.id === id);
      if (!s) return { rowCount: 0, rows: [] };
      const u = localStore.users.find(usr => usr.id === s.user_id);
      return {
        rowCount: 1,
        rows: [{
          id: s.id,
          phone: s.phone || null,
          roll_no: s.roll_no,
          department: s.department,
          semester: s.semester,
          admission_year: s.admission_year,
          created_at: s.created_at,
          updated_at: s.updated_at,
          user_id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
          must_change_password: !!u.must_change_password,
        }],
      };
    }

    let list = localStore.students.map(s => {
      const u = localStore.users.find(usr => usr.id === s.user_id);
      const enrCount = localStore.enrollments.filter(e => e.student_id === s.id && e.status === 'ACTIVE').length;
      return {
        id: s.id,
        phone: s.phone || null,
        roll_no: s.roll_no,
        department: s.department,
        semester: s.semester,
        admission_year: s.admission_year,
        created_at: s.created_at,
        user_id: u?.id,
        name: u?.name || 'Unknown',
        email: u?.email || '',
        status: u?.status || 'ACTIVE',
        must_change_password: !!u?.must_change_password,
        enrolled_courses_count: enrCount,
      };
    });

    // Check filters
    for (let p of params) {
      if (typeof p === 'string' && p.startsWith('%') && p.endsWith('%')) {
        const term = p.slice(1, -1).toLowerCase();
        list = list.filter(s => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term) || s.roll_no.toLowerCase().includes(term));
      } else if (p === 'Computer Science' || p === 'Information Technology') {
        list = list.filter(s => s.department === p);
      }
    }

    return { rowCount: list.length, rows: list };
  }

  // 8. Faculty Directory
  if (lower.includes('from faculty f') && lower.includes('join users u on u.id = f.user_id')) {
    if (lower.includes('where f.id = $1')) {
      const id = params[0];
      const f = localStore.faculty.find(fac => fac.id === id);
      if (!f) return { rowCount: 0, rows: [] };
      const u = localStore.users.find(usr => usr.id === f.user_id);
      return {
        rowCount: 1,
        rows: [{
          id: f.id,
          employee_id: f.employee_id,
          department: f.department,
          designation: f.designation,
          created_at: f.created_at,
          user_id: u.id,
          name: u.name,
          email: u.email,
          status: u.status,
        }],
      };
    }

    const rows = localStore.faculty.map(f => {
      const u = localStore.users.find(usr => usr.id === f.user_id);
      const cCount = localStore.courses.filter(c => c.faculty_id === f.id).length;
      return {
        id: f.id,
        employee_id: f.employee_id,
        department: f.department,
        designation: f.designation,
        created_at: f.created_at,
        user_id: u?.id,
        name: u?.name,
        email: u?.email,
        status: u?.status || 'ACTIVE',
        assigned_courses_count: cCount,
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 9. Course Catalog
  if (lower.includes('from courses') && !lower.includes('join enrollments e on e.id = m.enrollment_id')) {
    if (lower.includes('where c.id = $1') || lower.includes('where id = $1')) {
      const id = params[0];
      const c = localStore.courses.find(crs => crs.id === id);
      if (!c) return { rowCount: 0, rows: [] };
      const f = c.faculty_id ? localStore.faculty.find(fac => fac.id === c.faculty_id) : null;
      const fu = f ? localStore.users.find(u => u.id === f.user_id) : null;
      return {
        rowCount: 1,
        rows: [{
          id: c.id,
          code: c.code,
          name: c.name,
          credits: c.credits,
          department: c.department,
          semester: c.semester,
          created_at: c.created_at,
          faculty_id: c.faculty_id || (f ? f.id : null),
          employee_id: f ? f.employee_id : null,
          designation: f ? f.designation : null,
          faculty_name: fu ? fu.name : null,
          faculty_email: fu ? fu.email : null,
        }],
      };
    }

    const rows = localStore.courses.map(c => {
      const f = c.faculty_id ? localStore.faculty.find(fac => fac.id === c.faculty_id) : null;
      const fu = f ? localStore.users.find(u => u.id === f.user_id) : null;
      const enrCount = localStore.enrollments.filter(e => e.course_id === c.id && e.status === 'ACTIVE').length;
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        credits: c.credits,
        department: c.department,
        semester: c.semester,
        created_at: c.created_at,
        faculty_id: f ? f.id : null,
        faculty_employee_id: f ? f.employee_id : null,
        faculty_name: fu ? fu.name : null,
        enrolled_count: enrCount,
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 10. Enrollments Roster
  if (lower.includes('from enrollments e') && lower.includes('where e.course_id = $1')) {
    const courseId = params[0];
    const enrs = localStore.enrollments.filter(e => e.course_id === courseId && e.status === 'ACTIVE');
    const rows = enrs.map(e => {
      const s = localStore.students.find(stu => stu.id === e.student_id);
      const u = s ? localStore.users.find(usr => usr.id === s.user_id) : null;
      return {
        enrollment_id: e.id,
        academic_year: e.academic_year,
        enrollment_status: e.status,
        student_id: s ? s.id : null,
        roll_no: s ? s.roll_no : '',
        student_name: u ? u.name : '',
        student_email: u ? u.email : '',
        student_department: s ? s.department : '',
        student_semester: s ? s.semester : 5,
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 11. Attendance Sheet
  if (lower.includes('from enrollments e') && lower.includes('left join attendance a on a.enrollment_id = e.id and a.date = $2')) {
    const [courseId, date] = params;
    const enrs = localStore.enrollments.filter(e => e.course_id === courseId && e.status === 'ACTIVE');
    const rows = enrs.map(e => {
      const s = localStore.students.find(stu => stu.id === e.student_id);
      const u = s ? localStore.users.find(usr => usr.id === s.user_id) : null;
      const att = localStore.attendance.find(a => a.enrollment_id === e.id && a.date === date);
      return {
        enrollment_id: e.id,
        academic_year: e.academic_year,
        student_id: s ? s.id : null,
        roll_no: s ? s.roll_no : '',
        student_name: u ? u.name : '',
        student_email: u ? u.email : '',
        department: s ? s.department : '',
        semester: s ? s.semester : 5,
        attendance_id: att ? att.id : null,
        attendance_status: att ? att.status : 'PRESENT',
        updated_at: att ? att.updated_at : null,
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 12. Marks Gradebook
  if (lower.includes('from enrollments e') && lower.includes('left join marks m on m.enrollment_id = e.id')) {
    const courseId = params[0];
    const assessment = params[1] || null;
    const enrs = localStore.enrollments.filter(e => e.course_id === courseId && e.status === 'ACTIVE');
    const rows = enrs.map(e => {
      const s = localStore.students.find(stu => stu.id === e.student_id);
      const u = s ? localStore.users.find(usr => usr.id === s.user_id) : null;
      const m = localStore.marks.find(mk => mk.enrollment_id === e.id && (!assessment || mk.assessment === assessment));
      return {
        enrollment_id: e.id,
        academic_year: e.academic_year,
        student_id: s ? s.id : null,
        roll_no: s ? s.roll_no : '',
        student_name: u ? u.name : '',
        student_email: u ? u.email : '',
        mark_id: m ? m.id : null,
        assessment: m ? m.assessment : assessment,
        score: m ? m.score : null,
        max_score: m ? m.max_score : 50,
        updated_at: m ? m.updated_at : null,
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 13. Reports: Department summary
  if (lower.includes('group by s.department') && lower.includes('from students s')) {
    const depts = ['Computer Science', 'Information Technology'];
    const rows = depts.map(dept => {
      const stus = localStore.students.filter(s => s.department === dept);
      return {
        department: dept,
        total_students: stus.length,
        active_courses: localStore.courses.filter(c => c.department === dept).length,
        avg_marks_percentage: dept === 'Computer Science' ? '82.4' : '78.5',
        avg_attendance_rate: dept === 'Computer Science' ? '88.5' : '92.0',
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 14. Reports: Top students
  if (lower.includes('top performing students') || (lower.includes('from students s') && lower.includes('order by aggregate_score desc'))) {
    const rows = localStore.students.map((s, idx) => {
      const u = localStore.users.find(usr => usr.id === s.user_id);
      const scores = [92.5, 87.0, 79.5, 76.0, 72.0];
      const atts = ['94.0', '88.0', '85.0', '92.0', '78.0'];
      return {
        id: s.id,
        roll_no: s.roll_no,
        student_name: u?.name || 'Student',
        department: s.department,
        semester: s.semester,
        aggregate_score: scores[idx] || 75.0,
        attendance_rate: atts[idx] || '80.0',
      };
    });
    return { rowCount: rows.length, rows };
  }

  // 15. Exams Queries & Relational Lookups
  if (lower.includes('from exams ex') || (lower.includes('from exams') && !lower.startsWith('insert into') && !lower.startsWith('update'))) {
    // Check single lookup by id
    if (lower.includes('where id = $1') || lower.includes('where ex.id = $1')) {
      const id = params[0];
      const ex = localStore.exams.find(e => e.id === id);
      if (!ex) return { rowCount: 0, rows: [] };
      const crs = localStore.courses.find(c => c.id === ex.course_id);
      const f = crs?.faculty_id ? localStore.faculty.find(fac => fac.id === crs.faculty_id) : null;
      const fu = f ? localStore.users.find(u => u.id === f.user_id) : null;
      return {
        rowCount: 1,
        rows: [{
          ...ex,
          course_code: crs ? crs.code : '',
          course_name: crs ? crs.name : '',
          credits: crs ? crs.credits : 3,
          faculty_name: fu ? fu.name : 'Unassigned',
        }],
      };
    }

    // Room Conflict Check
    if (lower.includes('lower(room) = lower($1)')) {
      const [room, examDate] = params;
      const conflicts = localStore.exams.filter(e =>
        e.room && e.room.toLowerCase() === room.toLowerCase() &&
        e.exam_date === examDate &&
        e.status !== 'CANCELLED'
      );
      return { rowCount: conflicts.length, rows: conflicts };
    }

    // Course Date Conflict Check
    if (lower.includes('where course_id = $1 and exam_date = $2')) {
      const [courseId, examDate] = params;
      const conflicts = localStore.exams.filter(e =>
        e.course_id === courseId &&
        e.exam_date === examDate &&
        e.status !== 'CANCELLED'
      );
      return { rowCount: conflicts.length, rows: conflicts };
    }

    let list = localStore.exams.map(ex => {
      const crs = localStore.courses.find(c => c.id === ex.course_id);
      const f = crs?.faculty_id ? localStore.faculty.find(fac => fac.id === crs.faculty_id) : null;
      const fu = f ? localStore.users.find(u => u.id === f.user_id) : null;
      return {
        id: ex.id,
        course_id: ex.course_id,
        title: ex.title,
        exam_type: ex.exam_type,
        exam_date: ex.exam_date,
        start_time: ex.start_time,
        end_time: ex.end_time,
        duration_minutes: ex.duration_minutes,
        room: ex.room,
        semester: ex.semester,
        academic_year: ex.academic_year,
        instructions: ex.instructions,
        status: ex.status,
        created_at: ex.created_at,
        updated_at: ex.updated_at,
        course_code: crs ? crs.code : '',
        course_name: crs ? crs.name : '',
        credits: crs ? crs.credits : 3,
        faculty_name: fu ? fu.name : 'Unassigned',
      };
    });

    // Student enrollment filter
    if (lower.includes('where e.student_id = $1') || lower.includes('join enrollments e')) {
      const stuId = params[0];
      const myEnrollments = localStore.enrollments.filter(e => e.student_id === stuId && e.status === 'ACTIVE');
      const myCourseIds = myEnrollments.map(e => e.course_id);
      list = list.filter(ex => myCourseIds.includes(ex.course_id));
    } else if (lower.includes('c.faculty_id = $1') || lower.includes('faculty_id = $1')) {
      const facId = params[0];
      const facCourses = localStore.courses.filter(c => c.faculty_id === facId).map(c => c.id);
      list = list.filter(ex => facCourses.includes(ex.course_id) || ex.created_by === params[1]);
    }

    // Status filter
    if (params.includes('UPCOMING') || params.includes('COMPLETED') || params.includes('CANCELLED')) {
      const statParam = params.find(p => ['UPCOMING', 'COMPLETED', 'CANCELLED', 'ONGOING'].includes(p));
      if (statParam) list = list.filter(e => e.status === statParam);
    }

    // Course filter
    for (const p of params) {
      if (typeof p === 'string' && p.startsWith('c') && localStore.courses.some(c => c.id === p)) {
        list = list.filter(e => e.course_id === p);
      }
    }

    // Sort by exam_date ASC
    list.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

    if (lower.includes('limit 6')) {
      list = list.slice(0, 6);
    }

    return { rowCount: list.length, rows: list };
  }

  // 16. INSERT / UPDATE / DELETE Operations
  if (lower.startsWith('insert into exams')) {
    const [
      course_id,
      title,
      exam_type,
      exam_date,
      start_time,
      end_time,
      duration_minutes,
      room,
      semester,
      academic_year,
      instructions,
      created_by,
    ] = params;

    const newEx = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      course_id,
      title,
      exam_type,
      exam_date,
      start_time,
      end_time,
      duration_minutes: duration_minutes || 120,
      room,
      semester: parseInt(semester, 10) || 5,
      academic_year: academic_year || '2024-2025',
      instructions: instructions || null,
      created_by,
      status: 'UPCOMING',
      created_at: new Date(),
      updated_at: new Date(),
    };
    localStore.exams.push(newEx);
    return { rowCount: 1, rows: [newEx] };
  }

  if (lower.startsWith('update exams')) {
    const examId = params[params.length - 1];
    const ex = localStore.exams.find(e => e.id === examId);
    if (ex) {
      if (lower.includes("status = 'cancelled'")) {
        ex.status = 'CANCELLED';
      }
      if (lower.includes('title = $')) {
        const tParam = params.find(p => typeof p === 'string' && p.length > 2 && !p.startsWith('ex-'));
        if (tParam) ex.title = tParam;
      }
      if (lower.includes('room = $')) {
        const rParam = params.find(p => typeof p === 'string' && (p.includes('Room') || p.includes('Hall') || p.includes('Lab')));
        if (rParam) ex.room = rParam;
      }
      ex.updated_at = new Date();
    }
    return { rowCount: 1, rows: [] };
  }

  if (lower.startsWith('insert into users')) {
    const [name, email, password_hash, role, status, must_change_password] = params;
    const newU = {
      id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name,
      email: email.toLowerCase(),
      password_hash,
      role: role || 'STUDENT',
      status: status || 'ACTIVE',
      must_change_password: must_change_password !== undefined ? !!must_change_password : true,
      created_at: new Date(),
      updated_at: new Date(),
    };
    localStore.users.push(newU);
    return { rowCount: 1, rows: [newU] };
  }

  if (lower.startsWith('insert into students')) {
    const [user_id, phone, roll_no, department, semester, admission_year] = params;
    // Check if phone was passed in first param or second param
    const isParam2Roll = typeof phone === 'string' && (phone.startsWith('CS') || phone.startsWith('IT') || phone.length < 15 && !phone.includes('+') && !phone.includes('(') && !phone.includes('-'));
    const actualPhone = isParam2Roll ? null : phone;
    const actualRoll = isParam2Roll ? phone : roll_no;
    const actualDept = isParam2Roll ? roll_no : department;
    const actualSem = isParam2Roll ? department : semester;
    const actualYear = isParam2Roll ? semester : admission_year;

    const newS = {
      id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id,
      phone: actualPhone || null,
      roll_no: actualRoll,
      department: actualDept,
      semester: parseInt(actualSem, 10),
      admission_year: parseInt(actualYear, 10),
      created_at: new Date(),
      updated_at: new Date(),
    };
    localStore.students.push(newS);
    return { rowCount: 1, rows: [newS] };
  }

  if (lower.startsWith('insert into faculty')) {
    const [user_id, employee_id, department, designation] = params;
    const newF = {
      id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id,
      employee_id,
      department,
      designation,
      phone: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    localStore.faculty.push(newF);
    return { rowCount: 1, rows: [newF] };
  }

  if (lower.startsWith('insert into courses')) {
    const [code, name, credits, department, semester, faculty_id] = params;
    const newC = {
      id: `c-${Date.now()}`,
      code,
      name,
      credits,
      department,
      semester,
      faculty_id,
      created_at: new Date(),
    };
    localStore.courses.push(newC);
    return { rowCount: 1, rows: [newC] };
  }

  if (lower.startsWith('insert into enrollments')) {
    const [student_id, course_id, academic_year] = params;
    const newE = {
      id: `e-${Date.now()}`,
      student_id,
      course_id,
      academic_year,
      status: 'ACTIVE',
      created_at: new Date(),
    };
    localStore.enrollments.push(newE);
    return { rowCount: 1, rows: [newE] };
  }

  if (lower.includes('insert into attendance')) {
    const [enrollment_id, date, status, marked_by] = params;
    const existing = localStore.attendance.find(a => a.enrollment_id === enrollment_id && a.date === date);
    if (existing) {
      existing.status = status;
      existing.marked_by = marked_by;
      existing.updated_at = new Date();
    } else {
      localStore.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        enrollment_id,
        date,
        status,
        marked_by,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    return { rowCount: 1, rows: [] };
  }

  if (lower.includes('insert into marks')) {
    const [enrollment_id, assessment, score, max_score, entered_by] = params;
    const existing = localStore.marks.find(m => m.enrollment_id === enrollment_id && m.assessment === assessment);
    if (existing) {
      existing.score = score;
      existing.max_score = max_score;
      existing.entered_by = entered_by;
      existing.updated_at = new Date();
    } else {
      localStore.marks.push({
        id: `mk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        enrollment_id,
        assessment,
        score,
        max_score,
        entered_by,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    return { rowCount: 1, rows: [] };
  }

  if (lower.startsWith('insert into audit_logs')) {
    const [actor_id, action, entity, entity_id, details, ip_address] = params;
    localStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor_id,
      action,
      entity,
      entity_id,
      details: typeof details === 'string' ? JSON.parse(details || '{}') : details,
      ip_address,
      created_at: new Date(),
    });
    return { rowCount: 1, rows: [] };
  }

  if (lower.startsWith('update users')) {
    const userId = params[params.length - 1];
    const u = localStore.users.find(usr => usr.id === userId);
    if (u) {
      if (lower.includes('password_hash')) {
        u.password_hash = params[0];
        u.must_change_password = false;
      }
      if (lower.includes('name = $1') || lower.includes('name = $')) {
        u.name = params[0];
      }
      if (lower.includes('email = $1') || lower.includes('email = $')) {
        const eParam = params.find(p => typeof p === 'string' && p.includes('@'));
        if (eParam) u.email = eParam.toLowerCase();
      }
      if (lower.includes('status = $')) {
        const sParam = params.find(p => p === 'ACTIVE' || p === 'INACTIVE' || p === 'SUSPENDED');
        if (sParam) u.status = sParam;
      }
      u.updated_at = new Date();
    }
    return { rowCount: 1, rows: [] };
  }

  if (lower.startsWith('update students')) {
    const studentId = params[params.length - 1];
    const s = localStore.students.find(stu => stu.id === studentId || stu.user_id === studentId);
    if (s) {
      if (lower.includes('phone = $1') || lower.includes('phone = $')) {
        s.phone = params[0];
      }
      if (lower.includes('department = $')) {
        const dParam = params.find(p => p === 'Computer Science' || p === 'Information Technology');
        if (dParam) s.department = dParam;
      }
      s.updated_at = new Date();
    }
    return { rowCount: 1, rows: [] };
  }

  if (lower.startsWith('update faculty')) {
    const facultyId = params[params.length - 1];
    const f = localStore.faculty.find(fac => fac.id === facultyId || fac.user_id === facultyId);
    if (f) {
      if (lower.includes('phone = $1') || lower.includes('phone = $')) {
        f.phone = params[0];
      }
      f.updated_at = new Date();
    }
    return { rowCount: 1, rows: [] };
  }

  // Generic fallback
  return { rowCount: 0, rows: [] };
}

/**
 * Transaction Helper
 */
const withTransaction = async (callback) => {
  if (pool && isPgAvailable) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Local simulated atomic transaction
  if (!localStoreEnabled) {
    throw new Error('Database is unavailable and the local storage engine is disabled in production.');
  }
  return callback({
    query: async (text, params) => query(text, params),
  });
};

/**
 * Health check probe
 */
const checkDbHealth = async () => {
  if (pool && isPgAvailable) {
    try {
      const res = await pool.query('SELECT 1 as is_healthy, NOW() as server_time');
      return {
        status: 'UP',
        healthy: true,
        mode: 'PostgreSQL (Cloud SQL)',
        timestamp: res.rows[0].server_time,
      };
    } catch (err) {
      isPgAvailable = false;
    }
  }

  if (!localStoreEnabled) {
    return {
      status: 'DOWN',
      healthy: false,
      mode: 'PostgreSQL (Cloud SQL)',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: 'UP',
    healthy: true,
    mode: 'Local Relational Storage Engine (Dev Active)',
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  pool,
  query,
  withTransaction,
  checkDbHealth,
};
