const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/tasks'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @return {Promise<google.auth.OAuth2>}
 */
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        // Store the token to disk for later program executions
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        console.error('Error retrieving access token', err);
        reject(err);
      }
    });
  });
}

/**
 * Load or request or authorization to call APIs.
 */
async function authorize() {
  let credentials;
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    credentials = JSON.parse(content);
  } catch (err) {
    console.error("Missing credentials.json!");
    console.error("Please create an OAuth 2.0 Web Client ID in Google Cloud Console");
    console.error("and save it as 'credentials.json' in this folder.");
    process.exit(1);
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  try {
    // Check if we have previously stored a token.
    const token = await fs.readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (err) {
    return await getNewToken(oAuth2Client);
  }
}

module.exports = { authorize };
