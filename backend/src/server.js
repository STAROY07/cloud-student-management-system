const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Import modular API routers
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const studentRoutes = require('./routes/student.routes');
const facultyRoutes = require('./routes/faculty.routes');
const courseRoutes = require('./routes/course.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const markRoutes = require('./routes/mark.routes');
const reportRoutes = require('./routes/report.routes');
const auditRoutes = require('./routes/audit.routes');
const healthRoutes = require('./routes/health.routes');
const examRoutes = require('./routes/exam.routes');

const app = express();

// Trust proxy for Google Cloud Run load balancers
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows React SPA assets to load seamlessly
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin SPA)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request Logging Middleware for Cloud Observability
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.originalUrl.includes('/health')) {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, {
        ip: req.ip,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    }
  });
  next();
});

// API Routes Mounting
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/exams', examRoutes);

// Static file serving for production React build (Cloud Run deployment)
const clientBuildPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(clientBuildPath));

// Catch-all route for SPA client-side routing (non-API paths)
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return notFoundHandler(req, res);
  }
  const indexHtml = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      // In development if frontend is served by Vite separately
      return res.status(200).send(`
        <html>
          <head><title>Cloud Student Management System API</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>Cloud Student Management System — Backend API</h2>
            <p>API Server is running on port ${config.port} (Environment: ${config.nodeEnv})</p>
            <p>For frontend UI, run the Vite dev server at <a href="http://localhost:5173">http://localhost:5173</a></p>
            <p>Check health: <a href="/api/health">/api/health</a></p>
          </body>
        </html>
      `);
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start HTTP Server
let server;
if (require.main === module) {
  server = app.listen(config.port, () => {
    logger.info(`Server successfully started on port ${config.port} [Environment: ${config.nodeEnv}]`);
    logger.info(`Liveness probe active at http://localhost:${config.port}/api/health`);
  });
}

// Graceful Shutdown for Google Cloud Run Container lifecycle
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed. Exiting process.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force exit after 10s if connections linger
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };
