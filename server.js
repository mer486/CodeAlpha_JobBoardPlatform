// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const applicationRoutes = require('./src/routes/applicationRoutes');



const app = express();

// middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// routes
app.use('/api/auth', require('./src/routes/auth'));

app.get('/', (req, res) => res.send('Job Board API — Step 1 (Auth)'));
// existing lines...
app.use('/api/jobs', require('./src/routes/jobRoutes'));
app.use('/api/resumes', require('./src/routes/resumeRoutes'));
app.use('/api/applications', require('./src/routes/applicationRoutes'));

app.use('/api/applications', applicationRoutes);

const errorHandler = require('./src/middleware/errorMiddleware');
app.use(errorHandler);

const reportRoutes = require('./src/routes/reportRoutes');
app.use('/api/reports', reportRoutes);




// start
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect DB', err);
    process.exit(1);
  });
