const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Run database migrations on startup
const runMigration = require('./src/config/migrate');
runMigration().catch(err => console.error('Migration error on startup:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const accountRoutes = require('./src/routes/accountRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const tagRoutes = require('./src/routes/tagRoutes');
const goalRoutes = require('./src/routes/goalRoutes');
const recurringRoutes = require('./src/routes/recurringRoutes');
const householdRoutes = require('./src/routes/householdRoutes');

// Routes
app.get('/', (req, res) => {
  res.send('Finance Tracker API is running');
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/households', householdRoutes);


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});