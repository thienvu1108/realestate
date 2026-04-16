import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import session from 'express-session';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mayhomes-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: true, 
      sameSite: 'none',
      maxAge: 3600000 // 1 hour
    }
  }));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`
  );

  // API Routes
  app.get('/api/auth/google/url', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req.session as any).tokens = tokens;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Xác thực thành công! Cửa sổ này sẽ tự đóng.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/backup/sheets', async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) {
      return res.status(401).json({ error: 'Chưa xác thực Google' });
    }

    const { data, fileName } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    try {
      oauth2Client.setCredentials(tokens);
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // Create a new spreadsheet
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: fileName || `Backup_Mayhomes_${new Date().toISOString()}`,
          },
        },
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId!;

      // Prepare data for sheets
      // data is expected to be an array of { collectionName: string, docs: any[] }
      for (const collection of data) {
        const { collectionName, docs } = collection;
        if (!docs || docs.length === 0) continue;

        // Add a new sheet for each collection
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: collectionName,
                  },
                },
              },
            ],
          },
        });

        // Prepare rows
        const headers = Object.keys(docs[0]);
        const rows = [headers, ...docs.map((doc: any) => headers.map(h => {
          const val = doc[h];
          if (val && typeof val === 'object' && val.toDate) {
            return val.toDate().toISOString();
          }
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        }))];

        // Write data to the sheet
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${collectionName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rows,
          },
        });
      }

      // Remove the default "Sheet1" if we added others
      if (data.length > 0) {
        const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet1 = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Sheet1');
        if (sheet1) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  deleteSheet: {
                    sheetId: sheet1.properties?.sheetId,
                  },
                },
              ],
            },
          });
        }
      }

      res.json({ success: true, spreadsheetUrl: spreadsheet.data.spreadsheetUrl });
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ error: 'Backup thất bại: ' + (error as Error).message });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
