// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 4000;

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Replace with a secure random string in production
  resave: false,
  saveUninitialized: true
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Load local schema from schema.json (located in the repository root)
const schemaPath = path.join(__dirname, '..', 'schema.json');
let localSchema;
try {
  localSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
} catch (error) {
  console.error("Failed to load schema.json:", error);
  process.exit(1);
}
const targetSchemaVersion = parseFloat(localSchema.version);
const expectedColumns = localSchema.columns.map(col => col.name);

// Set up OAuth2 Client using environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Define required scopes, including Drive for copying files
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.file'
];

// Helper function to return a Google Sheets API client using OAuth tokens
function getSheetsClient(req) {
  if (req.session.tokens) {
    oauth2Client.setCredentials(req.session.tokens);
  } else {
    console.error('No OAuth tokens found in session.');
  }
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// Test API endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the Express server!' });
});

// OAuth Initiation Endpoint
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  res.redirect(authUrl);
});

// OAuth Callback Endpoint
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    res.send('Authentication successful! You can now close this window or proceed to the application.');
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).send('Authentication failed');
  }
});

// Endpoint to duplicate the master template using the Drive API
app.post('/sheets/create', async (req, res) => {
  const { schoolName } = req.body;
  if (!schoolName) {
    return res.status(400).json({ error: 'schoolName is required' });
  }

  const MASTER_TEMPLATE_ID = process.env.MASTER_TEMPLATE_ID; // Replace with your master template ID
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const copyResponse = await drive.files.copy({
      fileId: MASTER_TEMPLATE_ID,
      requestBody: {
        name: `${schoolName} BusTracker Data`
      }
    });
    res.json({
      message: 'Sheet created successfully',
      sheetId: copyResponse.data.id
    });
  } catch (error) {
    console.error('Error creating sheet:', error);
    res.status(500).json({ error: 'Failed to create sheet' });
  }
});

// Migration Function: Updates a school's sheet to the latest schema version
async function migrateSheet(sheetId, req) {
  const sheets = getSheetsClient(req);
  // Assume headers are in Sheet1, and version is stored in the "config" sheet cell A1
  const headerRange = 'Sheet1!A1:Z1';
  const versionRange = 'config!A1';

  // Get header row from Sheet1
  let headers = [];
  try {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: headerRange
    });
    if (headerRes.data.values && headerRes.data.values.length > 0) {
      headers = headerRes.data.values[0];
    }
  } catch (error) {
    console.error("Error reading header row:", error);
    throw error;
  }

  // Get current schema version from config!A1
  let currentVersion = 0;
  try {
    const versionRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: versionRange
    });
    if (versionRes.data.values && versionRes.data.values.length > 0 && versionRes.data.values[0].length > 0) {
      currentVersion = parseFloat(versionRes.data.values[0][0]) || 0;
    }
  } catch (error) {
    console.error("Error reading version from config sheet:", error);
    // If version cannot be read, assume version 0 to force migration.
  }

  console.log(`Current sheet version: ${currentVersion}, Target version: ${targetSchemaVersion}`);

  if (currentVersion >= targetSchemaVersion) {
    console.log('Sheet is already up-to-date.');
    return { updated: false, message: 'Sheet is up-to-date.' };
  }

  // Identify missing columns: those in expectedColumns that are not in headers
  const missingColumns = expectedColumns.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    console.log(`Missing columns: ${missingColumns.join(', ')}`);
    headers = headers.concat(missingColumns);
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: headerRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
      console.log('Header row updated with missing columns.');
    } catch (error) {
      console.error("Error updating header row:", error);
      throw error;
    }
  } else {
    console.log('No missing columns; only version update required.');
  }

  // Update the version cell in config!A1 to the target schema version
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: versionRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[localSchema.version]] }
    });
    console.log("Version updated to:", localSchema.version);
  } catch (error) {
    console.error("Error updating version in config sheet:", error);
    throw error;
  }

  console.log("Migration complete: Sheet updated to new schema version.");
  return { updated: true, message: 'Migration complete', missingColumns };
}

// Endpoint to trigger schema migration on a school's sheet
app.post('/sheets/migrate', async (req, res) => {
  const { sheetId } = req.body;
  if (!sheetId) {
    return res.status(400).json({ error: 'sheetId is required' });
  }
  try {
    const result = await migrateSheet(sheetId, req);
    res.json(result);
  } catch (error) {
    console.error("Migration failed:", error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});