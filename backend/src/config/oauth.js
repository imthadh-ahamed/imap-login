import { google } from "googleapis";

// Create a reusable OAuth2 client using credentials from environment variables.
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

export default oauth2Client;