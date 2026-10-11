const express = require('express');
const cors = require('cors');
const tenantMiddleware = require('./middleware/tenant');
const errorHandler = require('./middleware/errorHandler');
const tenantRoutes = require('./routes/tenantRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/tenants', tenantRoutes);
app.use('/api/api-keys', tenantMiddleware, apiKeyRoutes);
app.use('/api/workflows', tenantMiddleware, rateLimiter, apiKeyAuth, workflowRoutes);

app.use(errorHandler);

module.exports = app;