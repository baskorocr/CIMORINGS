const { getConnection, connectDB } = require('./config/database');

async function addSocColumn() {
  try {
    await connectDB();
    const connection = getConnection();
    
    console.log('Adding soc column to transactions table...');
    
    // Check if column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'csms_db' 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'soc'
    `);
    
    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE transactions 
        ADD COLUMN soc DECIMAL(5,2) DEFAULT NULL COMMENT 'State of Charge (Battery %)'
      `);
      console.log('✅ soc column added successfully');
    } else {
      console.log('ℹ️ soc column already exists');
    }
    
    // Verify the column was added
    const [verify] = await connection.execute(`
      DESCRIBE transactions
    `);
    
    console.log('Current transactions table structure:');
    verify.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding soc column:', error);
    process.exit(1);
  }
}

addSocColumn();