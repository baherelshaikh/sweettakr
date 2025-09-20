const { Pool, types  } = require('pg');
require('dotenv').config();

class PostgresDatabase {

    constructor(config) {
        this.config = config
        this.connected = false

        console.log('🔄 Ceating database pool...');
        this.createPool(this.config);    
        

        // Return dATE in form like '2025-04-17'
        types.setTypeParser(types.builtins.DATE, (val) => val);

        // Return tIMESTAMP in form like '2025-04-17'
        types.setTypeParser(types.builtins.TIMESTAMP, (val) => val.split(' ')[0]);

        this.client = null; // For transaction management
        this.maxRetries = 5;
        this.retryDelay = 5000;
    }

    async connect(retries = 0) {
        try {
            this.client = await this.pool.connect();
            console.log('✅ Connected to PostgreSQL database.');

            // Handle unexpected connection termination
            this.client.on('error', (err) => {
                console.error('🚨 Unexpected database error:', err);
                this.handleDatabaseFailure(this.client);
            });
        } catch (error) {
            console.error('❌ Database connection failed:', error);

            if (retries < this.maxRetries) {
                console.log(`🔄 Retrying connection (${retries + 1}/${this.maxRetries})...`);
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                return this.connect(retries + 1);
            } else {
                console.error('🚨 Max retries reached. Restarting the app...');
                // this.restartApp(); // Restart the app
            }
        }
    }



    async query(query, values) {
        if (this.client) {
            return this.client.query(query, values); // Use the client for transactions
        }
        return this.pool.query(query, values); // Use the pool for non-transactional queries
    }

    async close() {
        try {
            if (this.client) {
                this.client.release(); // Release the client back to the pool
            }
            await this.pool.end();
            // logger.info('PostgreSQL connection closed.');
        } catch (error) {
            await this.handleConnectionError(error, 'close PostgreSQL connection');
        }
    }

    // Transaction methods
    async beginTransaction() {
        try {
            await this.client.query('BEGIN');
            // logger.info('Transaction started.');
        } catch (error) {
            await this.handleConnectionError(error, 'start transaction');
        }
    }

    async commitTransaction() {
        try {
            await this.client.query('COMMIT');
            // logger.info('Transaction committed.');
        } catch (error) {
            await this.handleConnectionError(error, 'commit transaction');
        }
    }

    async rollbackTransaction() {
        try {
            await this.client.query('ROLLBACK');
            // logger.info('Transaction rolled back.');
        } catch (error) {
            await this.handleConnectionError(error, 'roll back transaction');
        }
    }

    
    async createPool(config, retries = 0) {
        try{

            // Determine if the config is a connection string or a configuration object
            this.pool = typeof config === 'string' ? 
            new Pool({ connectionString: config, 
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }) :
                new Pool(config);
                
            console.log('✅ Pool created.'); 

            // Handle unexpected connection termination
            this.pool.on('error', (err) => {
                console.error('🚨 Unexpected database error:', err);
                this.handleDatabaseFailure(this.pool);
            });   
            this.connected = await this.checkPoolHealth();

        } catch (error){
            console.error('❌ Database connection failed:', error);
            if (retries < this.maxRetries) {
                console.log(`🔄 Retrying connection (${retries + 1}/${this.maxRetries})...`);
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
                return await this.createPool(this.config, retries + 1);
            }else {
                console.log('✅ Server is still listening however just one SQL DB connected .. ')
            }
        }
    }

    async checkPoolHealth() {
        await this.pool.query('SELECT 1');
        console.log('✅ Pool is connected!');
        return true;
    }

    // Handle database failure (graceful shutdown & restart)
    handleDatabaseFailure(object) {
        console.log('⚠️ Closing all database connections before restart...');
        this.close().then(() => {
            if (object === this.pool){
                console.log('🔄 Receating database pool...');
                this.createPool(this.config); // Recreate the pool if connection fails
            }else {
                console.log('🔄 Receating database pool...');
                this.createPool(this.config); // Recreate the pool if connection fails
                this.connect();
            }
        })
    }
}

const db = new PostgresDatabase({
  host: process.env.NHOST_POSTGRES_HOST,
  port: process.env.NHOST_POSTGRES_PORT,
  database: process.env.NHOST_POSTGRES_DATABASE,
  user: process.env.NHOST_POSTGRES_USER,
  password: process.env.NHOST_POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  connectionTimeoutMillis: 10000, 
  idleTimeoutMillis: 10000,
  allowExitOnIdle: false,
})

module.exports = {
  query: (text, params) => db.query(text, params),
  pool: db.pool
};
