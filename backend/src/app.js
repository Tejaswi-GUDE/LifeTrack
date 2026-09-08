const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const referenceRoutes = require('./routes/reference.routes');
const dashboardRoutes = require('./routes/dashboards.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const traineeRoutes = require('./routes/trainees.routes');
const interventionRoutes = require('./routes/interventions.routes');
const followupRoutes = require('./routes/followups.routes');
const verificationRoutes = require('./routes/verifications.routes');
const courseRoutes = require('./routes/courses.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', referenceRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/trainees', traineeRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
