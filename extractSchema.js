// extractSchema.js

// Load environment variables from the .env file located in the server folder.
require('dotenv').config({ path: './server/.env' });

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Retrieve necessary environment variables.
const MASTER_TEMPLATE_ID = process.env.MASTER_TEMPLATE_ID;
if (!MASTER_TEMPLATE_ID) {
  console.error("MASTER_TEMPLATE_ID not set in environment variables.");
  process.exit(1);
}

const MASTER_SHEET_NAME = 'BT_Master';  // The name of your master sheet
const HEADER_RANGE = `${MASTER_SHEET_NAME}!A1:Z1`; // Range for the header row.
const CONFIG_RANGE = 'config!A1';  // Range for the version number in the config sheet.
const OUTPUT_SCHEMA_PATH = path.join(__dirname, 'schema.json');
const DEFAULT_SCHEMA_VERSION = "1.0";  // Fallback version if config sheet has no version

// Set up OAuth2 Client using environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:4000/auth/google/callback';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

if (!REFRESH_TOKEN) {
  console.error("No REFRESH_TOKEN found in environment variables.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// Create a Google Sheets client
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

async function extractSchema() {
  try {
    // Read the header row from the master template sheet.
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_TEMPLATE_ID,
      range: HEADER_RANGE
    });
    let headers = [];
    if (headerRes.data.values && headerRes.data.values.length > 0) {
      headers = headerRes.data.values[0];
    } else {
      console.error('No header row found in the master template.');
      process.exit(1);
    }
    console.log('Extracted headers:', headers);

    // Read the schema version from the config sheet.
    let schemaVersion = DEFAULT_SCHEMA_VERSION; // Fallback
    try {
      const versionRes = await sheets.spreadsheets.values.get({
        spreadsheetId: MASTER_TEMPLATE_ID,
        range: CONFIG_RANGE
      });
      if (versionRes.data.values &&
          versionRes.data.values.length > 0 &&
          versionRes.data.values[0].length > 0 &&
          versionRes.data.values[0][0]
      ) {
        schemaVersion = versionRes.data.values[0][0].toString();
      } else {
        console.warn("No version found in config!A1. Using default schema version:", DEFAULT_SCHEMA_VERSION);
      }
    } catch (versionError) {
      console.error("Error reading version from config sheet:", versionError.response ? versionError.response.data : versionError.message);
      console.warn("Falling back to default schema version:", DEFAULT_SCHEMA_VERSION);
    }

    // Build the schema object based on headers.
    // For simplicity, assume each column is of type "string" with an empty description.
    const columns = headers.map(header => ({
      name: header,
      type: "string",
      description: ""
    }));

    const schema = {
      version: schemaVersion,
      columns: columns
    };

    // Write the schema object to schema.json with pretty-printing.
    fs.writeFileSync(OUTPUT_SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`Schema successfully written to ${OUTPUT_SCHEMA_PATH}`);
  } catch (error) {
    console.error('Error extracting schema:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

extractSchema();