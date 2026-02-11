const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, '../public')));

// Routes
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const lotRoutes = require('./routes/lot.routes');

const quoteRoutes = require('./routes/quote.routes');

const clientRoutes = require('./routes/client.routes');
const saleRoutes = require('./routes/sale.routes');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/lotes', lotRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/users', require('./routes/user.routes'));

app.get('/', (req, res) => {
    res.redirect('/login');
});

// Serve Admin Views
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

// Database Sync
sequelize.sync({ alter: true }).then(() => {
    console.log('Database connected and synced');
}).catch(err => {
    console.error('Unable to connect to the database:', err);
});

module.exports = app;
