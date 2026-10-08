const express = require('express');
const cors = require('cors');
const tenantMiddleware = require('./middleware/tenant');
const errorHandler = require('./middleware/errorHandler');
const tenantRoutes = require('./routes/tenantRoutes');
const workflowRoutes = require('./routes/workflowRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/tenants', tenantRoutes);
app.use('/api/workflows', tenantMiddleware, workflowRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use(errorHandler);
module.exports = app;