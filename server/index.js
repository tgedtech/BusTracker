const express = require('express');
const cors = require('cors');  // Import cors
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // Enable CORS for all routes

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the Express server!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});