import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Clean database - removes all records from emails and users tables
 */
async function cleanEmailsTable() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'gmail_db'
    });

    console.log('Connected to database successfully');
    
    // Disable foreign key checks temporarily
    console.log('Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Truncate emails table first (has foreign key to users)
    console.log('Cleaning emails table...');
    await connection.query('TRUNCATE TABLE emails');
    console.log('✅ Emails table cleaned');
    
    // Truncate users table
    console.log('Cleaning users table...');
    await connection.query('TRUNCATE TABLE users');
    console.log('✅ Users table cleaned');
    
    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✅ Database cleaned successfully');
    console.log('All email and user records have been removed');
    
  } catch (error) {
    console.error('❌ Error cleaning emails table:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the cleanup
cleanEmailsTable()
  .then(() => {
    console.log('\n✅ Database cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database cleanup failed:', error);
    process.exit(1);
  });
