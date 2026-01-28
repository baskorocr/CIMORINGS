const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// Pre-download file when status becomes 'Uploaded'
const preDownloadDiagnosticFile = async (request) => {
  const client = new ftp.Client();
  try {
    await client.access({
      host: '8.215.34.200',
      port: 2121,
      user: 'ftpadmin',
      password: 'Dharmap77'
    });

    const fileName = request.file_name;
    const ftpPath = `/ftp/diagnostic/DC/DPM120kw/${request.charge_point_id}/${request.message_id}/${fileName}`;
    
    // Create permanent storage directory
    const storageDir = path.join(__dirname, '../storage/diagnostics');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    const localPath = path.join(storageDir, `${request.id}_${fileName}`);
    
    console.log(`Pre-downloading diagnostic file: ${ftpPath} -> ${localPath}`);
    await client.downloadTo(localPath, ftpPath);
    client.close();
    
    console.log(`✅ File pre-downloaded: ${localPath}`);
    return localPath;
  } catch (error) {
    client.close();
    console.error('Pre-download failed:', error.message);
    throw error;
  }
};

module.exports = { preDownloadDiagnosticFile };
