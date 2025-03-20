require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Examiner routes
app.get('/examiner/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'examiner', 'dashboard.html'));
});

app.get('/examiner/create-exam', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'examiner', 'create-exam.html'));
});

// Student routes
app.get('/student/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'dashboard.html'));
});

app.get('/student/take-exam/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student', 'take-exam.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
