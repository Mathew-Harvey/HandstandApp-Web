const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
// Ebook and assets (e.g. images) for the training guide
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// SPA fallback — serve index.html for all unmatched routes (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Handstand Web running on port ${PORT}`));
