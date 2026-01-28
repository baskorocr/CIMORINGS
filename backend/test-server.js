const express = require('express');
const { connectDB } = require('./config/database');
const { downloadDiagnosticFile } = require('./controllers/diagnosticsController');

const app = express();

// Test endpoint without auth
app.get('/test-download/:requestId', async (req, res) => {
  console.log('Testing download for request ID:', req.params.requestId);
  await downloadDiagnosticFile(req, res);
});

connectDB().then(() => {
  app.listen(3001, () => {
    console.log('Test server running on port 3001');
    console.log('Test URL: http://localhost:3001/test-download/30');
  });
});
