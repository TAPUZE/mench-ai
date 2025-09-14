const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'mench-ai-backend',
    version: '1.0.0'
  });
});

router.get('/detailed', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'mench-ai-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid
    }
  });
});

module.exports = router;