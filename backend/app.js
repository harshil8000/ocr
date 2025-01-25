const express = require('express');
const cors = require('cors');
const aadharRoutes = require('./routes/aadharRoutes'); // Import Aadhaar router

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Aadhaar routes
app.use('/api/aadhar', aadharRoutes);

// Server setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
