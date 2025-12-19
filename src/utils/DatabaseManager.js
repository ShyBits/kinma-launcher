/**
 * DatabaseManager - Handles all database operations for Kinma Launcher
 * Uses MySQL database for persistent storage
 */

// Try to load mysql2 - handle both development and production paths
let mysql2;
try {
  // First try normal require (works in most cases)
  mysql2 = require('mysql2');
} catch (error) {
  // If that fails, try with explicit path resolution
  try {
    const path = require('path');
    const fs = require('fs');
    
    // Try different possible paths
    const possiblePaths = [
      path.join(__dirname, '../../node_modules/mysql2'),
      path.join(process.cwd(), 'node_modules/mysql2'),
      path.resolve(__dirname, '../../node_modules/mysql2')
    ];
    
    let found = false;
    for (const mysql2Path of possiblePaths) {
      if (fs.existsSync(mysql2Path)) {
        mysql2 = require(mysql2Path);
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new Error('mysql2 module not found. Please run: npm install mysql2');
    }
  } catch (pathError) {
    console.error('Failed to load mysql2:', pathError);
    throw new Error('mysql2 module not available. Please install it with: npm install mysql2');
  }
}

// Create promise-based wrapper
const mysql = {
  createConnection: (config) => {
    return new Promise((resolve, reject) => {
      const connection = mysql2.createConnection(config);
      connection.connect((err) => {
        if (err) {
          reject(err);
        } else {
          // Wrap connection methods to return promises
          const originalExecute = connection.execute.bind(connection);
          const originalQuery = connection.query.bind(connection);
          const originalEnd = connection.end.bind(connection);
          
          connection.execute = (sql, params) => {
            return new Promise((resolve, reject) => {
              originalExecute(sql, params, (err, results, fields) => {
                if (err) reject(err);
                else resolve([results, fields]); // Return [results, fields] like mysql2/promise
              });
            });
          };
          
          connection.query = (sql, params) => {
            return new Promise((resolve, reject) => {
              originalQuery(sql, params, (err, results) => {
                if (err) reject(err);
                else resolve(results);
              });
            });
          };
          
          connection.end = () => {
            return new Promise((resolve, reject) => {
              originalEnd((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          };
          
          resolve(connection);
        }
      });
    });
  }
};

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.config = {
      // Using direct IP address (like PDO connection)
      // This bypasses DNS/Cloudflare and connects directly to the MariaDB server
      host: '192.168.178.200',
      port: 3306,
      user: 'root',
      password: 'itab123',
      database: 'kinma-launcher',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    this.initialized = false;
  }

  /**
   * Initialize database connection and create tables if they don't exist
   */
  async initialize() {
    if (this.initialized && this.connection) {
      return true;
    }

    try {
      // Set connection timeout and additional options
      const connectionConfig = {
        ...this.config,
        connectTimeout: 10000, // 10 seconds timeout
        enableKeepAlive: true, // Keep connection alive (like PDO)
        keepAliveInitialDelay: 0 // Start keepalive immediately
      };

      // First connect without database to create it if needed
      const tempConnection = await mysql.createConnection({
        host: connectionConfig.host,
        port: connectionConfig.port,
        user: connectionConfig.user,
        password: connectionConfig.password,
        connectTimeout: connectionConfig.connectTimeout
      });

      // Create database if it doesn't exist
      await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${connectionConfig.database}\``);
      await tempConnection.end();

      // Now connect to the database
      this.connection = await mysql.createConnection(connectionConfig);

      // Create tables
      await this.createTables();

      this.initialized = true;
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      console.error('Database initialization error:', error);
      this.connection = null;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Create all necessary tables
   */
  async createTables() {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        fullName VARCHAR(255),
        phone VARCHAR(50),
        dateOfBirth DATE,
        gender VARCHAR(20),
        address TEXT,
        city VARCHAR(255),
        zipCode VARCHAR(20),
        country VARCHAR(100),
        acceptTerms BOOLEAN DEFAULT FALSE,
        devIntent BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastLoginTime DATETIME,
        isLoggedIn BOOLEAN DEFAULT FALSE,
        stayLoggedIn BOOLEAN DEFAULT FALSE,
        hiddenInSwitcher BOOLEAN DEFAULT FALSE,
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Games table
      `CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(255) PRIMARY KEY,
        gameId VARCHAR(255) NOT NULL,
        userId VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description LONGTEXT,
        developer VARCHAR(255),
        version VARCHAR(50),
        status VARCHAR(50) DEFAULT 'public',
        downloads INT DEFAULT 0,
        banner LONGTEXT,
        logo LONGTEXT,
        title LONGTEXT,
        screenshots LONGTEXT,
        metadata LONGTEXT,
        addedToLibraryAt DATETIME,
        purchasedAt DATETIME,
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_gameId (gameId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Settings table
      `CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        key_name VARCHAR(255) NOT NULL,
        value LONGTEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_key (userId, key_name),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Ratings table
      `CREATE TABLE IF NOT EXISTS ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gameId VARCHAR(255) NOT NULL,
        userId VARCHAR(255) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_game_user (gameId, userId),
        INDEX idx_gameId (gameId),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Playing games table
      `CREATE TABLE IF NOT EXISTS playing_games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gameId VARCHAR(255) NOT NULL,
        userId VARCHAR(255) NOT NULL,
        startTime DATETIME,
        endTime DATETIME,
        duration INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gameId (gameId),
        INDEX idx_userId (userId),
        INDEX idx_startTime (startTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Game states table
      `CREATE TABLE IF NOT EXISTS game_states (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gameId VARCHAR(255) NOT NULL,
        userId VARCHAR(255) NOT NULL,
        state_data LONGTEXT,
        status VARCHAR(50),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_game_user (gameId, userId),
        INDEX idx_gameId (gameId),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Inventory table
      `CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        itemId VARCHAR(255) NOT NULL,
        itemType VARCHAR(100),
        itemData LONGTEXT,
        quantity INT DEFAULT 1,
        acquiredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_itemId (itemId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Developer access requests table
      `CREATE TABLE IF NOT EXISTS developer_access_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        email VARCHAR(255),
        reason LONGTEXT,
        status VARCHAR(50) DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Sidebar settings table
      `CREATE TABLE IF NOT EXISTS sidebar_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        width INT DEFAULT 260,
        manuallyResized BOOLEAN DEFAULT FALSE,
        collapsed BOOLEAN DEFAULT FALSE,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (userId),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Market settings table
      `CREATE TABLE IF NOT EXISTS market_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        rightSidebarWidth INT DEFAULT 300,
        sidebarCollapsed BOOLEAN DEFAULT FALSE,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (userId),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Store settings table
      `CREATE TABLE IF NOT EXISTS store_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        activeFilter VARCHAR(50) DEFAULT 'grid',
        currency VARCHAR(10) DEFAULT 'USD',
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (userId),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Library settings table
      `CREATE TABLE IF NOT EXISTS library_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        expandedFolders LONGTEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (userId),
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Password reset tokens table
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        expiresAt DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_userId (userId),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Previous passwords table
      `CREATE TABLE IF NOT EXISTS previous_passwords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        changedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userId (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Cart items table
      `CREATE TABLE IF NOT EXISTS cart_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        itemId VARCHAR(255) NOT NULL,
        itemType VARCHAR(100) DEFAULT 'funds',
        amount DECIMAL(10, 2) NOT NULL,
        itemData LONGTEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_itemId (itemId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    for (const query of queries) {
      try {
        await this.connection.execute(query);
      } catch (error) {
        // Ignore "table already exists" errors, but log others
        if (!error.message.includes('already exists')) {
          console.error('Error creating table:', error);
        }
      }
    }
    
    // Alter existing tables to use LONGTEXT for large data columns
    await this.migrateTableColumns();
  }

  /**
   * Migrate existing table columns to LONGTEXT if needed
   */
  async migrateTableColumns() {
    const alterQueries = [
      `ALTER TABLE games MODIFY COLUMN description LONGTEXT`,
      `ALTER TABLE games MODIFY COLUMN banner LONGTEXT`,
      `ALTER TABLE games MODIFY COLUMN logo LONGTEXT`,
      `ALTER TABLE games MODIFY COLUMN title LONGTEXT`,
      `ALTER TABLE games MODIFY COLUMN screenshots LONGTEXT`,
      `ALTER TABLE games MODIFY COLUMN metadata LONGTEXT`,
      `ALTER TABLE settings MODIFY COLUMN value LONGTEXT`,
      `ALTER TABLE game_states MODIFY COLUMN state_data LONGTEXT`,
      `ALTER TABLE inventory MODIFY COLUMN itemData LONGTEXT`,
      `ALTER TABLE developer_access_requests MODIFY COLUMN reason LONGTEXT`,
      `ALTER TABLE library_settings MODIFY COLUMN expandedFolders LONGTEXT`,
      `ALTER TABLE cart_items MODIFY COLUMN itemData LONGTEXT`
    ];

    for (const query of alterQueries) {
      try {
        await this.connection.execute(query);
      } catch (error) {
        // Ignore errors if column doesn't exist or is already correct type
        if (!error.message.includes('Duplicate column name') && 
            !error.message.includes('Unknown column')) {
          // Silently ignore - column might already be correct type
        }
      }
    }
  }

  /**
   * Get database connection
   */
  async getConnection() {
    if (!this.initialized || !this.connection) {
      const initialized = await this.initialize();
      if (!initialized || !this.connection) {
        throw new Error('Database connection not available');
      }
    }
    return this.connection;
  }

  /**
   * Execute a query
   */
  async query(sql, params = []) {
    try {
      const connection = await this.getConnection();
      if (!connection) {
        throw new Error('Database connection is null');
      }
      const result = await connection.execute(sql, params);
      // connection.execute returns [results, fields] - extract just results
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      // Reset connection on error to force reconnection on next query
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.message.includes('connection')) {
        this.connection = null;
        this.initialized = false;
      }
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      this.initialized = false;
    }
  }

  /**
   * Check if migration has been completed
   */
  async isMigrationCompleted() {
    try {
      const result = await this.query(
        "SELECT value FROM settings WHERE userId = 'system' AND key_name = 'migration_completed'"
      );
      if (Array.isArray(result) && result.length > 0) {
        return result[0] && result[0].value === 'true';
      }
      return false;
    } catch (error) {
      // If database is not available, assume migration not completed
      return false;
    }
  }

  /**
   * Mark migration as completed
   */
  async markMigrationCompleted() {
    try {
      await this.query(
        `INSERT INTO settings (userId, key_name, value) VALUES ('system', 'migration_completed', 'true')
         ON DUPLICATE KEY UPDATE value = 'true'`
      );
    } catch (error) {
      console.error('Error marking migration as completed:', error);
      // Don't throw - migration can continue even if marking fails
    }
  }
}

// Create singleton instance
let dbManager = null;

/**
 * Get database manager instance
 */
function getDatabaseManager() {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }
  return dbManager;
}

module.exports = { DatabaseManager, getDatabaseManager };

