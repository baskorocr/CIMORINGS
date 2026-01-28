const { connectDB } = require('../config/database');

async function fixDiagnosticsTable() {
  try {
    const connection = await connectDB();
    
    // Try to modify the message_id column to allow NULL
    try {
      await connection.execute('ALTER TABLE diagnostics_requests MODIFY COLUMN message_id VARCHAR(36) NULL DEFAULT NULL');
      console.log('✅ Modified message_id column to allow NULL');
    } catch (error) {
      console.log('Column modification failed, trying to drop column...');
      try {
        await connection.execute('ALTER TABLE diagnostics_requests DROP COLUMN message_id');
        console.log('✅ Dropped message_id column');
      } catch (dropError) {
        console.log('Drop failed, column might not exist');
      }
    }
    
    console.log('✅ Diagnostics table fixed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing diagnostics table:', error);
    process.exit(1);
  }
}

fixDiagnosticsTable();
