const { connectDB } = require('./config/database');
const { downloadDiagnosticFile } = require('./controllers/diagnosticsController');

// Initialize database connection
connectDB().then(() => {
  console.log('Database connected');
  testDownload();
}).catch(err => {
  console.error('Database connection failed:', err);
});

function testDownload() {
const mockReq = {
  params: { requestId: '30' } // Use the uploaded request
};

const mockRes = {
  headersSent: false,
  status: (code) => ({
    json: (data) => {
      console.log(`Status ${code}:`, data);
      return mockRes;
    }
  }),
  json: (data) => {
    console.log('Success:', data);
    return mockRes;
  },
  setHeader: (name, value) => {
    console.log(`Header: ${name} = ${value}`);
    return mockRes;
  },
  pipe: function() {
    console.log('Response pipe called - this should not happen');
    return mockRes;
  },
  write: (data) => {
    console.log('Writing data to response...');
    return true;
  },
  end: () => {
    console.log('Response ended');
    return mockRes;
  }
};

// Test the download function
console.log('Testing diagnostic file download...');
downloadDiagnosticFile(mockReq, mockRes);
}
