// server/index.js

// Load environment variables from the .env file located in the server folder.
require('dotenv').config({ path: './.env' });

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const chokidar = require('chokidar');
const logger = require('./logger');
const cors = require('cors');

const app = express();app.use(cors());
const PORT = process.env.PORT || 4000;

// Serve static files from the client folder (for devPanel.html, etc.)
app.use(express.static(path.join(__dirname, '..', 'client')));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Replace with a secure value in production
  resave: false,
  saveUninitialized: true
}));

// Middleware to parse JSON bodies
app.use(express.json());

// --- Dynamic Schema Reloading ---

// Path to the schema file (in the project root)
const schemaPath = path.join(__dirname, '..', 'schema.json');

// Cached schema object – updated by the file watcher
let cachedSchema = null;

// Function to load the schema from disk
function loadSchema() {
  try {
    const data = fs.readFileSync(schemaPath, 'utf8');
    cachedSchema = JSON.parse(data);
    logger.info(`Schema reloaded: version ${cachedSchema.version}`);
  } catch (error) {
    logger.error("Failed to load schema.json: " + error.message);
  }
}

// Initial load of the schema
loadSchema();

// Watch schema.json for changes using chokidar
chokidar.watch(schemaPath).on('change', () => {
  logger.info("schema.json has changed. Reloading schema...");
  loadSchema();
});

// Helper function to return target schema details from cachedSchema
function getSchemaDetails() {
  if (!cachedSchema) {
    throw new Error("Schema not loaded");
  }
  return {
    targetSchemaVersion: parseFloat(cachedSchema.version),
    expectedColumns: cachedSchema.columns.map(col => col.name)
  };
}

// --- End Dynamic Schema Reloading ---

// Set up OAuth2 Client using environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4000/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Define required scopes (including full Drive scope)
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive'
];

// Helper function to obtain a valid Google Sheets API client using OAuth tokens.
// If no session token exists, fall back to REFRESH_TOKEN from environment and refresh the access token.
async function getSheetsClient(req) {
  if (req.session.tokens) {
    oauth2Client.setCredentials(req.session.tokens);
    logger.debug('OAuth tokens set on oauth2Client from session.');
  } else if (process.env.REFRESH_TOKEN) {
    logger.warn('No session tokens found; falling back to REFRESH_TOKEN from environment.');
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
    // Explicitly trigger refreshing the access token.
    try {
      const accessTokenInfo = await oauth2Client.getAccessToken();
      logger.debug('Obtained access token via refresh: ' + accessTokenInfo.token);
    } catch (err) {
      logger.error('Error obtaining access token using refresh token: ' + err.message);
      throw err;
    }
  } else {
    logger.error('No OAuth tokens or REFRESH_TOKEN available.');
    throw new Error("No credentials available");
  }
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// --- OAuth and API Endpoints ---

// Test API endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the Express server!' });
});

// OAuth Initiation Endpoint
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Request a refresh token as well
    prompt: 'consent',       // Force re-consent to ensure a refresh token is issued
    scope: SCOPES
  });
  logger.debug('Redirecting to Google OAuth URL: ' + authUrl);
  res.redirect(authUrl);
});

// OAuth Callback Endpoint
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  logger.debug('Received auth code: ' + code);
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    logger.debug('Received tokens: ' + JSON.stringify(tokens));
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    res.send('Authentication successful! You can now close this window or proceed to the application.');
  } catch (error) {
    logger.error('Error exchanging code for token: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    res.status(500).send('Authentication failed');
  }
});

// Temporary Endpoint to Force Reauthentication (clears session tokens)
app.get('/auth/force-logout', (req, res) => {
  req.session.tokens = null;
  logger.info("Session tokens cleared via /auth/force-logout.");
  res.send('Logged out. Please reauthenticate.');
});

// Endpoint to duplicate the master template using the Drive API
app.post('/sheets/create', async (req, res) => {
  const { schoolName } = req.body;
  logger.debug('Received request to create sheet for school: ' + schoolName);
  if (!schoolName) {
    return res.status(400).json({ error: 'schoolName is required' });
  }
  const MASTER_TEMPLATE_ID = process.env.MASTER_TEMPLATE_ID;
  logger.debug('Using MASTER_TEMPLATE_ID: ' + MASTER_TEMPLATE_ID);
  
  // Ensure credentials are set by calling getSheetsClient (even though we're using the Drive API below)
  try {
    await getSheetsClient(req);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to obtain OAuth credentials', details: err.message });
  }
  
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  try {
    const copyResponse = await drive.files.copy({
      fileId: MASTER_TEMPLATE_ID,
      requestBody: {
        name: `${schoolName} BusTracker Data`
      }
    });
    logger.debug('Drive copy response: ' + JSON.stringify(copyResponse.data));
    res.json({ message: 'Sheet created successfully', sheetId: copyResponse.data.id });
  } catch (error) {
    logger.error('Error creating sheet: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    res.status(500).json({ error: 'Failed to create sheet', details: error.message });
  }
});

// Endpoint to trigger schema migration on a school's sheet
// Assumes that the header row is in 'BT_Master!A1:Z1' and the schema version is stored in 'config!A1'
app.post('/sheets/migrate', async (req, res) => {
  const { sheetId } = req.body;
  if (!sheetId) {
    return res.status(400).json({ error: 'sheetId is required' });
  }
  try {
    // Migration function defined inline for brevity
    const result = await (async function migrateSheet(sheetId, req) {
      const sheets = await getSheetsClient(req);
      const headerRange = 'BT_Master!A1:Z1';
      const versionRange = 'config!A1';

      // Get header row from BT_Master sheet
      let headers = [];
      try {
        const headerRes = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: headerRange
        });
        if (headerRes.data.values && headerRes.data.values.length > 0) {
          headers = headerRes.data.values[0];
        }
        logger.debug('Current headers: ' + JSON.stringify(headers));
      } catch (error) {
        logger.error("Error reading header row: " + (error.response ? JSON.stringify(error.response.data) : error.message));
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
        logger.debug('Current schema version in sheet: ' + currentVersion);
      } catch (error) {
        logger.error("Error reading version from config sheet: " + (error.response ? JSON.stringify(error.response.data) : error.message));
        // Proceed with currentVersion = 0 if reading fails
      }

      // Get target schema details from cachedSchema
      const { targetSchemaVersion, expectedColumns } = getSchemaDetails();
      logger.debug(`Comparing current version (${currentVersion}) to target version (${targetSchemaVersion}).`);

      if (currentVersion >= targetSchemaVersion) {
        logger.info('Sheet is already up-to-date.');
        return { updated: false, message: 'Sheet is already up-to-date.' };
      }

      // Identify missing columns from expectedColumns
      const missingColumns = expectedColumns.filter(col => !headers.includes(col));
      logger.debug('Missing columns: ' + JSON.stringify(missingColumns));

      if (missingColumns.length > 0) {
        headers = headers.concat(missingColumns);
        try {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: headerRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [headers] }
          });
          logger.info('Header row updated with missing columns.');
        } catch (error) {
          logger.error("Error updating header row: " + (error.response ? JSON.stringify(error.response.data) : error.message));
          throw error;
        }
      } else {
        logger.info('No missing columns; only version update required.');
      }

      // Update the version cell in config!A1 to the target schema version from cachedSchema
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: versionRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[cachedSchema.version]] }
        });
        logger.info("Version cell updated to: " + cachedSchema.version);
      } catch (error) {
        logger.error("Error updating version in config sheet: " + (error.response ? JSON.stringify(error.response.data) : error.message));
        throw error;
      }

      logger.info("Migration complete: Sheet updated to new schema version.");
      return { updated: true, message: 'Migration complete', missingColumns };
    })(sheetId, req);
    res.json(result);
  } catch (error) {
    logger.error("Migration failed: " + (error.response ? JSON.stringify(error.response.data) : error.message));
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
});

// Mount access code routes
const accessCodeRoutes = require('./routes/accessCodeRoutes');
app.use('/access-code', accessCodeRoutes);

// Mount dashboard routes
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/dashboard', dashboardRoutes);

// Database synchronization (for development)
const db = require('./models');
db.sequelize.sync({ alter: true }).then(() => {
  logger.info("Database synchronized with alter: true");
}).catch(err => {
  logger.error("Database synchronization failed: " + err.message);
});

// Start the Express server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});