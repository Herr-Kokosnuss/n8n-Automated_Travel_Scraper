// Import the Express library to create the web server
const express = require('express');
const cors = require('cors');
const app = express();

// Import your custom route handlers
const fly4freeRoutes = require('./scrapers/fly4free');

// Enable CORS for all routes
app.use(cors());

// Enable JSON body parsing for incoming requests
app.use(express.json());

// Mount route modules under specific paths
app.use('/scrape/fly4free', fly4freeRoutes);

// Start the server on PORT 4000
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));