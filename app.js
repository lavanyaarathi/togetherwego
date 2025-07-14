const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

console.log("app.js started");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/ping', (req, res) => {
    console.log("✅ /ping was hit!");
    res.send("pong");
});

app.use(express.static('public'));

const dbConfig = {
    host: 'localhost',
    user: 'testuser',
    password: 'yourpassword',
    database: 'togetherwego'
};

async function initializeDatabase() {
    let connection;
    try {
        // First, connect without specifying a database
        connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        console.log("MySQL connection established successfully.");

        await connection.query(`USE ${dbConfig.database}`);

        console.log('Database exists');

    } catch (error) {
        console.error('Database initialization error:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        throw error;
    }
}

initializeDatabase();

app.use((req, res, next) => {
    const userId = req.headers['user-id'];
    req.user_id = userId || null;
    next();
});

// Improved Sign-up endpoint with better error handling
app.post('/signup', async (req, res) => {
    let connection;
    try {
        const { name, email, password } = req.body;
        
        // Input validation
        if (!name || !email || !password) {
            return res.status(400).send({
                message: 'Name, email, and password are required'
            });
        }

        console.log('Attempting to create user:', { name, email }); // Don't log password
        
        connection = await mysql.createConnection(dbConfig);
        
        // Check if user already exists
        const [existingUsers] = await connection.execute('SELECT * FROM Users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).send({
                message: 'User with this email already exists'
            });
        }
        
        // Insert new user
        const [result] = await connection.execute(
            'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)', 
            [name, email, password, 'member']
        );
        
        console.log('User created successfully:', result);
        
        res.status(201).send({
            message: 'User created successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Detailed error creating user:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        
        // Handle specific MySQL errors
        if (error.code === 'ER_NO_SUCH_TABLE') {
            res.status(500).send({
                message: 'Database table "Users" does not exist'
            });
        } else if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).send({
                message: 'User with this email already exists'
            });
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            res.status(500).send({
                message: 'Database access denied'
            });
        } else {
            res.status(500).send({
                message: 'Failed to create user',
                error: error.message
            });
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// Improved Login endpoint with better error handling
app.post('/login', async (req, res) => {
    let connection;
    try {
        const { email } = req.body;
        
        // Input validation
        if (!email) {
            return res.status(400).send({
                message: 'Email is required'
            });
        }

        console.log('Attempting to login user:', email);
        
        connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT * FROM Users WHERE email = ?', [email]);
        
        console.log('Users found:', users.length);

        if (users.length > 0) {
            res.status(200).send({
                message: 'Login successful',
                user: users[0]
            });
        } else {
            res.status(401).send({
                message: 'Invalid credentials - user not found'
            });
        }
    } catch (error) {
        console.error('Detailed error during login:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        
        res.status(500).send({
            message: 'Login failed',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// Database connection test endpoint (add this for debugging)
app.get('/test-db', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute('SELECT 1');
        
        // Check if Users table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'Users'");
        
        if (tables.length === 0) {
            return res.status(500).send({
                message: 'Users table does not exist',
                suggestion: 'Please create the Users table first'
            });
        }
        
        // Check table structure
        const [columns] = await connection.query('DESCRIBE Users');
        
        res.status(200).send({
            message: 'Database connection successful',
            tablesFound: tables.length,
            userTableStructure: columns
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).send({
            message: 'Database connection failed',
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});
app.get('/groups', async (req, res) => {
    try {
        const userId = req.user_id;

        if (!userId) {
            return res.status(401).send({ message: 'Unauthorized: User not logged in' });
        }

        const connection = await mysql.createConnection(dbConfig);
        const [groups] = await connection.execute(`
            SELECT g.* FROM TravelGroup g
            JOIN User_Group ug ON g.group_id = ug.group_id
            WHERE ug.user_id = ?
        `, [userId]);

        connection.end();
        res.status(200).send(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).send({ message: 'Failed to fetch groups' });
    }
});

app.post('/groups', async (req, res) => {
    try {
        const { name, organizer_id } = req.body;

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO TravelGroup (name, organizer_id) VALUES (?, ?)', [name, organizer_id]);
        const groupId = result.insertId;

        await connection.execute('INSERT INTO User_Group (user_id, group_id) VALUES (?, ?)', [organizer_id, groupId]);

        connection.end();
        res.status(200).send({
            message: 'Group created successfully',
            groupId
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).send({ message: 'Failed to create group', error: error.message });
    }
});

// More updates for /trips, /activities, /budget, /expenses, etc., should be added here using the corrected table names

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

