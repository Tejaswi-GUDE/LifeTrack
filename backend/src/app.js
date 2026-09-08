const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const dashboardRoutes = require('./routes/dashboards.routes');
const traineeRoutes = require('./routes/trainees.routes');
const interventionRoutes = require('./routes/interventions.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/trainees', traineeRoutes);
app.use('/api/interventions', interventionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
