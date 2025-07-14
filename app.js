const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

const dbConfig = {
    host: 'localhost',
    user: 'testuser',
    password: 'StrongPass123!',
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

        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await connection.execute(`USE ${dbConfig.database}`);

        console.log(`Database '${dbConfig.database}' is ready.`);

        // Create Users table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('member', 'admin') DEFAULT 'member',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Groups table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`Groups\` (
                group_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                organizer_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organizer_id) REFERENCES Users(user_id) ON DELETE CASCADE
            )
        `);

        // Create User_Group junction table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS User_Group (
                user_id INT,
                group_id INT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, group_id),
                FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (group_id) REFERENCES \`Groups\`(group_id) ON DELETE CASCADE
            )
        `);

        // Create Trips table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Trips (
                trip_id INT AUTO_INCREMENT PRIMARY KEY,
                group_id INT NOT NULL,
                destination VARCHAR(255) NOT NULL,
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES \`Groups\`(group_id) ON DELETE CASCADE
            )
        `);

        // Create Activities table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Activities (
                activity_id INT AUTO_INCREMENT PRIMARY KEY,
                trip_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                cost DECIMAL(10, 2) DEFAULT 0,
                suggested_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
                FOREIGN KEY (suggested_by) REFERENCES Users(user_id) ON DELETE SET NULL
            )
        `);

        // Create Budget table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Budget (
                budget_id INT AUTO_INCREMENT PRIMARY KEY,
                trip_id INT NOT NULL,
                total_budget DECIMAL(10, 2) NOT NULL,
                expenses DECIMAL(10, 2) DEFAULT 0,
                balance DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE
            )
        `);

        // Create Expenses table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Expenses (
                expense_id INT AUTO_INCREMENT PRIMARY KEY,
                budget_id INT,
                trip_id INT,
                user_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (budget_id) REFERENCES Budget(budget_id) ON DELETE CASCADE,
                FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
            )
        `);

        // Create Itinerary table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Itinerary (
                itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
                trip_id INT NOT NULL,
                activity_id INT NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
                FOREIGN KEY (activity_id) REFERENCES Activities(activity_id) ON DELETE CASCADE
            )
        `);

        // Create Voting table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Voting (
                voting_id INT AUTO_INCREMENT PRIMARY KEY,
                trip_id INT NOT NULL,
                option_type VARCHAR(100) NOT NULL,
                option_value TEXT NOT NULL,
                votes INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE
            )
        `);

        console.log('All database tables created successfully.');

    } catch (error) {
        console.error('Database initialization error:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }

initializeDatabase();

// Middleware to simulate user authentication (for testing purposes)
app.use((req, res, next) => {
    // In a real application, you'd get the user ID from a session or token
    // Check if user_id is stored in localStorage
    const userId = req.headers['user-id']; // Get the user ID from the request headers
    req.user_id = userId || null; // Set a default user ID for now (e.g., Alice)
    next();
});

// API endpoints
//Sign-up endpoint
app.post('/signup', async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, 'member']);
        connection.end();
        res.status(200).send({
            message: 'User created successfully',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).send({
            message: 'Failed to create user'
        });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const {
            email
        } = req.body; // Only email is required now
        const connection = await mysql.createConnection(dbConfig);
        const [users] = await connection.execute('SELECT * FROM Users WHERE email = ?', [email]); //Simplified
        connection.end();

        if (users.length > 0) {
            res.status(200).send({
                message: 'Login successful',
                user: users[0]
            });
        } else {
            res.status(401).send({
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send({
            message: 'Login failed'
        });
    }
});

// Groups API
app.get('/groups', async (req, res) => {
    try {
        const userId = req.user_id; // Get the user ID from the middleware

        if (!userId) {
            return res.status(401).send({
                message: 'Unauthorized: User not logged in'
            });
        }

        console.log('Fetching groups for userId:', userId); // Add this line

        const connection = await mysql.createConnection(dbConfig);
        const [groups] = await connection.execute(`
            SELECT g.* FROM \`Groups\` g
            JOIN User_Group ug ON g.group_id = ug.group_id
            WHERE ug.user_id = ?
        `, [userId]);

        console.log('Groups found:', groups); // Add this line

        connection.end();
        res.status(200).send(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).send({
            message: 'Failed to fetch groups'
        });
    }
});

app.post('/groups', async (req, res) => {
    try {
        const {
            name,
            organizer_id
        } = req.body;

        console.log('Received data for creating group:', {
            name,
            organizer_id
        });

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO \`Groups\` (name, organizer_id) VALUES (?, ?)', [name, organizer_id]);
        console.log('Result of create group query:', result);
        const groupId = result.insertId;

        // Associate the user with the group in User_Group table
        await connection.execute('INSERT INTO User_Group (user_id, group_id) VALUES (?, ?)', [organizer_id, groupId]);
        console.log('User associated with group successfully');

        connection.end();
        res.status(200).send({
            message: 'Group created successfully',
            groupId: result.insertId
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).send({
            message: 'Failed to create group',
            error: error.message
        });
    }
});

app.get('/groups/:groupId', async (req, res) => {
    try {
        const {
            groupId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [groups] = await connection.execute('SELECT * FROM \`Groups\` WHERE group_id = ?', [groupId]);
        connection.end();

        if (groups.length > 0) {
            res.status(200).send(groups[0]);
        } else {
            res.status(404).send({
                message: 'Group not found'
            });
        }
    } catch (error) {
        console.error('Error fetching group details:', error);
        res.status(500).send({
            message: 'Failed to fetch group details'
        });
    }
});

app.put('/groups/:groupId', async (req, res) => {
    try {
        const {
            groupId
        } = req.params;
        const {
            name
        } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE \`Groups\` SET name = ? WHERE group_id = ?', [name, groupId]);
        connection.end();
        res.status(200).send({
            message: 'Group updated successfully'
        });
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).send({
            message: 'Failed to update group'
        });
    }
});

app.delete('/groups/:groupId', async (req, res) => {
    try {
        const {
            groupId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM \`Groups\` WHERE group_id = ?', [groupId]);
        connection.end();
        res.status(200).send({
            message: 'Group deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).send({
            message: 'Failed to delete group'
        });
    }
});

// Trips API
app.get('/groups/:groupId/trips', async (req, res) => {
    try {
        const {
            groupId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [trips] = await connection.execute('SELECT * FROM Trips WHERE group_id = ?', [groupId]);
        connection.end();
        res.status(200).send(trips);
    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).send({
            message: 'Failed to fetch trips'
        });
    }
});

app.post('/groups/:groupId/trips', async (req, res) => {
    try {
        const {
            groupId
        } = req.params;
        const {
            destination,
            start_date,
            end_date
        } = req.body;

        console.log('Received data for creating trip:', {
            groupId,
            destination,
            start_date,
            end_date
        });

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO Trips (group_id, destination, start_date, end_date) VALUES (?, ?, ?, ?)', [groupId, destination, start_date, end_date]);
        console.log('Result of create trip query:', result);
        const tripId = result.insertId; // Get the newly inserted trip ID

        connection.end();
        res.status(200).send({
            message: 'Trip created successfully',
            tripId: tripId // Send the tripId back
        });
    } catch (error) {
        console.error('Error creating trip:', error);
        res.status(500).send({
            message: 'Failed to create trip',
            error: error.message
        });
    }
});

app.get('/trips/:tripId', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [trips] = await connection.execute('SELECT * FROM Trips WHERE trip_id = ?', [tripId]);
        connection.end();

        if (trips.length > 0) {
            res.status(200).send(trips[0]);
        } else {
            res.status(404).send({
                message: 'Trip not found'
            });
        }
    } catch (error) {
        console.error('Error fetching trip details:', error);
        res.status(500).send({
            message: 'Failed to fetch trip details'
        });
    }
});

app.put('/trips/:tripId', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const {
            destination,
            start_date,
            end_date
        } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE Trips SET destination = ?, start_date = ?, end_date = ? WHERE trip_id = ?', [destination, start_date, end_date, tripId]);
        connection.end();
        res.status(200).send({
            message: 'Trip updated successfully'
        });
    } catch (error) {
        console.error('Error updating trip:', error);
        res.status(500).send({
            message: 'Failed to update trip'
        });
    }
});

app.delete('/trips/:tripId', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM Trips WHERE trip_id = ?', [tripId]);
        connection.end();
        res.status(200).send({
            message: 'Trip deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting trip:', error);
        res.status(500).send({
            message: 'Failed to delete trip'
        });
    }
});

// Activities API
app.post('/trips/:tripId/activities', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const {
            name,
            cost,
            suggested_by
        } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO Activities (trip_id, name, cost, suggested_by) VALUES (?, ?, ?, ?)', [tripId, name, cost, suggested_by]);
        connection.end();
        res.status(200).send({
            message: 'Activity created successfully',
            activityId: result.insertId
        });
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).send({
            message: 'Failed to create activity'
        });
    }
});

app.get('/trips/:tripId/activities', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [activities] = await connection.execute('SELECT * FROM Activities WHERE trip_id = ?', [tripId]);
        connection.end();
        res.status(200).send(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).send({
            message: 'Failed to fetch activities'
        });
    }
});

// Budget API
app.post('/trips/:tripId/budget', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const {
            total_budget
        } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO Budget (trip_id, total_budget, balance) VALUES (?, ?, ?)', [tripId, total_budget, total_budget]);
        connection.end();
        res.status(200).send({
            message: 'Budget created successfully',
            budgetId: result.insertId
        });
    } catch (error) {
        console.error('Error creating budget:', error);
        res.status(500).send({
            message: 'Failed to create budget'
        });
    }
});

app.get('/trips/:tripId/budget', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [budgets] = await connection.execute('SELECT * FROM Budget WHERE trip_id = ?', [tripId]);
        connection.end();

        if (budgets.length > 0) {
            res.status(200).send(budgets[0]);
        } else {
            res.status(404).send({
                message: 'Budget not found'
            });
        }
    } catch (error) {
        console.error('Error fetching budget:', error);
        res.status(500).send({
            message: 'Failed to fetch budget'
        });
    }
});

// Expenses API
app.post('/budget/:budgetId/expenses', async (req, res) => {
    try {
        const {
            budgetId
        } = req.params;
        const {
            user_id,
            amount,
            description
        } = req.body;
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('INSERT INTO Expenses (budget_id, user_id, amount, description) VALUES (?, ?, ?, ?)', [budgetId, user_id, amount, description]);
        await connection.execute('UPDATE Budget SET expenses = expenses + ?, balance = total_budget - expenses WHERE budget_id = ?', [amount, budgetId]);
        connection.end();
        res.status(200).send({
            message: 'Expense added successfully'
        });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).send({
            message: 'Failed to add expense'
        });
    }
});

app.get('/budget/:budgetId/expenses', async (req, res) => {
    try {
        const {
            budgetId
        } = req.params;
        const connection = await mysql.createConnection(dbConfig);
        const [expenses] = await connection.execute('SELECT * FROM Expenses WHERE budget_id = ?', [budgetId]);
        connection.end();
        res.status(200).send(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).send({
            message: 'Failed to fetch expenses'
        });
    }
});

// Join Group API
app.post('/groups/join', async (req, res) => {
    try {
        const {
            groupName,
            userId
        } = req.body; // Get the group name and user ID from the request body

        console.log('Received data for joining group:', {
            groupName,
            userId
        });

        const connection = await mysql.createConnection(dbConfig);

        // Find the group ID based on the group name
        const [groups] = await connection.execute('SELECT group_id FROM \`Groups\` WHERE name = ?', [groupName]);

        if (groups.length === 0) {
            // If the group is not found, send a 404 response
            return res.status(404).send({
                message: 'Group not found'
            });
        }

        const groupId = groups[0].group_id;

        // Check if the user is already a member of the group
        const [existingMemberships] = await connection.execute('SELECT * FROM User_Group WHERE user_id = ? AND group_id = ?', [userId, groupId]);

        if (existingMemberships.length > 0) {
            // If the user is already a member, send a 400 response
            return res.status(400).send({
                message: 'User is already a member of this group'
            });
        }

        // Add the user to the group
        await connection.execute('INSERT INTO User_Group (user_id, group_id) VALUES (?, ?)', [userId, groupId]);
        console.log('User added to group successfully');

        connection.end();
        res.status(200).send({
            message: 'User joined group successfully'
        });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(500).send({
            message: 'Failed to join group',
            error: error.message
        });
    }
});

// Join Trip API
app.post('/trips/join', async (req, res) => {
    try {
        const {
            tripDestination,
            userId
        } = req.body; // Get the trip destination and user ID from the request body

        console.log('Received data for joining trip:', {
            tripDestination,
            userId
        });

        const connection = await mysql.createConnection(dbConfig);

        // Find the trip ID based on the trip destination
        const [trips] = await connection.execute('SELECT trip_id FROM Trips WHERE destination = ?', [tripDestination]);

        if (trips.length === 0) {
            // If the trip is not found, send a 404 response
            return res.status(404).send({
                message: 'Trip not found'
            });
        }

        const tripId = trips[0].trip_id;

        // Add the user to the expenses with trip id.
        await connection.execute('INSERT INTO Expenses (trip_id, user_id, amount, description) VALUES (?, ?, 0, "joined trip")', [tripId, userId]);
        console.log('User added to trip successfully');

        connection.end();
        // Redirect to the trip page after successfully joining the trip
        res.redirect(`/trip.html?tripId=${tripId}`);
    } catch (error) {
        console.error('Error joining trip:', error);
        res.status(500).send({
            message: 'Failed to join trip',
            error: error.message
        });
    }
});

// Create Activity Timeline
app.post('/trips/:tripId/itinerary', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const {
            activityId,
            date,
            time
        } = req.body;

        console.log('Received data for creating itinerary:', {
            tripId,
            activityId,
            date,
            time
        });

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO Itinerary (trip_id, activity_id, date, time) VALUES (?, ?, ?, ?)', [tripId, activityId, date, time]);
        console.log('Result of create itinerary query:', result);

        connection.end();
        res.status(200).send({
            message: 'Itinerary created successfully',
            itineraryId: result.insertId
        });
    } catch (error) {
        console.error('Error creating itinerary:', error);
        res.status(500).send({
            message: 'Failed to create itinerary',
            error: error.message
        });
    }
});

// Get Activity Timeline
app.get('/trips/:tripId/itinerary', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;

        console.log('Fetching itinerary for tripId:', tripId);

        const connection = await mysql.createConnection(dbConfig);
        const [itinerary] = await connection.execute(`
            SELECT i.*, a.name AS activity_name FROM Itinerary i
            JOIN Activities a ON i.activity_id = a.activity_id
            WHERE i.trip_id = ?
            ORDER BY i.date, i.time
        `, [tripId]);

        console.log('Itinerary found:', itinerary);

        connection.end();
        res.status(200).send(itinerary);
    } catch (error) {
        console.error('Error fetching itinerary:', error);
        res.status(500).send({
            message: 'Failed to fetch itinerary'
        });
    }
});

// Voting API
app.post('/trips/:tripId/voting', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;
        const {
            option_type,
            option_value
        } = req.body;

        console.log('Received data for creating voting option:', {
            tripId,
            option_type,
            option_value
        });

        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute('INSERT INTO Voting (trip_id, option_type, option_value) VALUES (?, ?, ?)', [tripId, option_type, option_value]);
        console.log('Result of create voting option query:', result);

        connection.end();
        res.status(200).send({
            message: 'Voting option created successfully',
            votingId: result.insertId
        });
    } catch (error) {
        console.error('Error creating voting option:', error);
        res.status(500).send({
            message: 'Failed to create voting option',
            error: error.message
        });
    }
});

app.get('/trips/:tripId/voting', async (req, res) => {
    try {
        const {
            tripId
        } = req.params;

        console.log('Fetching voting options for tripId:', tripId);

        const connection = await mysql.createConnection(dbConfig);
        const [votingOptions] = await connection.execute('SELECT * FROM Voting WHERE trip_id = ?', [tripId]);

        console.log('Voting options found:', votingOptions);

        connection.end();
        res.status(200).send(votingOptions);
    } catch (error) {
        console.error('Error fetching voting options:', error);
        res.status(500).send({
            message: 'Failed to fetch voting options'
        });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
