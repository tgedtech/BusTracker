const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// A simple API endpoint for testing
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the Express server!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});