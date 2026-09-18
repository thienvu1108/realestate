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

  // GitHub Backup & Sync API Endpoints
  app.post('/api/backup/github/test', async (req, res) => {
    try {
      const token = req.body.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
      if (!token) {
        return res.status(400).json({ error: 'Vui lòng cung cấp Personal Access Token (PAT) của GitHub.' });
      }
      let { owner, repo, branch } = req.body;
      if (!owner || !repo) {
        owner = 'thienvu1108';
        repo = 'realestate';
      }
      branch = branch || 'main';

      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Mayhomes-Backup-App',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (!repoRes.ok) {
        const errData = await repoRes.json().catch(() => ({})) as any;
        if (repoRes.status === 401) {
          return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn (401 Bad credentials).' });
        }
        if (repoRes.status === 404) {
          return res.status(404).json({ error: `Không tìm thấy repository '${owner}/${repo}' hoặc Token không có quyền truy cập repo này (404 Not Found).` });
        }
        return res.status(repoRes.status).json({ error: errData.message || 'Lỗi kết nối tới GitHub.' });
      }

      const repoData = await repoRes.json() as any;
      const defaultBranch = repoData.default_branch || 'main';

      const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Mayhomes-Backup-App'
        }
      });

      res.json({
        success: true,
        repo: {
          name: repoData.name,
          fullName: repoData.full_name,
          private: repoData.private,
          defaultBranch: defaultBranch,
          htmlUrl: repoData.html_url,
          permissions: repoData.permissions
        },
        branchExists: branchRes.ok,
        checkedBranch: branch
      });
    } catch (err: any) {
      console.error('GitHub test error:', err);
      res.status(500).json({ error: 'Lỗi kiểm tra kết nối GitHub: ' + err.message });
    }
  });

  app.post('/api/backup/github/sync', async (req, res) => {
    try {
      const token = req.body.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
      if (!token) {
        return res.status(400).json({ error: 'Vui lòng cung cấp Personal Access Token (PAT) của GitHub.' });
      }
      let { owner, repo, branch, folderPath, collections, commitMessage, userEmail } = req.body;
      if (!owner || !repo) {
        owner = 'thienvu1108';
        repo = 'realestate';
      }
      branch = branch || 'main';
      const cleanFolder = (folderPath || 'backups').replace(/^\/+|\/+$/g, '');

      if (!collections || typeof collections !== 'object') {
        return res.status(400).json({ error: 'Dữ liệu collections sao lưu không hợp lệ.' });
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Mayhomes-Backup-App',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      // Check repository
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        const errData = await repoRes.json().catch(() => ({})) as any;
        return res.status(repoRes.status).json({ error: errData.message || 'Không thể truy cập repository trên GitHub.' });
      }
      const repoData = await repoRes.json() as any;
      const targetBranch = branch || repoData.default_branch || 'main';

      // 1. Get latest commit SHA of targetBranch
      const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, { headers });
      
      let baseCommitSha: string | null = null;
      let baseTreeSha: string | null = null;

      if (refRes.ok) {
        const refData = await refRes.json() as any;
        baseCommitSha = refData.object.sha;
        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, { headers });
        if (commitRes.ok) {
          const commitData = await commitRes.json() as any;
          baseTreeSha = commitData.tree?.sha || null;
        }
      }

      // 2. Prepare tree items
      const nowIso = new Date().toISOString();
      const treeItems: any[] = [];
      const summary: Record<string, number> = {};
      let totalRecords = 0;

      for (const [colName, colData] of Object.entries(collections)) {
        const arr = Array.isArray(colData) ? colData : [];
        summary[colName] = arr.length;
        totalRecords += arr.length;
        
        const filePath = cleanFolder ? `${cleanFolder}/${colName}.json` : `${colName}.json`;
        treeItems.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          content: JSON.stringify(arr, null, 2)
        });
      }

      // Add manifest metadata
      const manifest = {
        syncDate: nowIso,
        syncedBy: userEmail || 'Mayhomes System',
        repository: `${owner}/${repo}`,
        branch: targetBranch,
        folder: cleanFolder,
        totalCollections: Object.keys(collections).length,
        totalRecords: totalRecords,
        collectionsSummary: summary
      };

      const manifestPath = cleanFolder ? `${cleanFolder}/manifest.json` : 'manifest.json';
      treeItems.push({
        path: manifestPath,
        mode: '100644',
        type: 'blob',
        content: JSON.stringify(manifest, null, 2)
      });

      // Bundle all collections into all_database_backup.json
      const bundlePath = cleanFolder ? `${cleanFolder}/all_database_backup.json` : 'all_database_backup.json';
      treeItems.push({
        path: bundlePath,
        mode: '100644',
        type: 'blob',
        content: JSON.stringify({ metadata: manifest, data: collections }, null, 2)
      });

      // 3. Create Tree
      const treePayload: any = { tree: treeItems };
      if (baseTreeSha) {
        treePayload.base_tree = baseTreeSha;
      }

      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(treePayload)
      });

      if (!treeRes.ok) {
        const treeErr = await treeRes.json().catch(() => ({})) as any;
        throw new Error(`Tạo Git Tree thất bại: ${treeErr.message || treeRes.statusText}`);
      }
      const treeData = await treeRes.json() as any;
      const newTreeSha = treeData.sha;

      // 4. Create Commit
      const commitPayload: any = {
        message: commitMessage || `Backup Mayhomes Realestate data (${totalRecords} bản ghi) - ${new Date().toLocaleString('vi-VN')}`,
        tree: newTreeSha,
        parents: baseCommitSha ? [baseCommitSha] : []
      };

      const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(commitPayload)
      });

      if (!newCommitRes.ok) {
        const commitErr = await newCommitRes.json().catch(() => ({})) as any;
        throw new Error(`Tạo Git Commit thất bại: ${commitErr.message || newCommitRes.statusText}`);
      }
      const newCommitData = await newCommitRes.json() as any;
      const newCommitSha = newCommitData.sha;

      // 5. Update or Create Branch Ref
      if (baseCommitSha) {
        const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sha: newCommitSha, force: false })
        });
        if (!updateRefRes.ok) {
          const updateErr = await updateRefRes.json().catch(() => ({})) as any;
          throw new Error(`Cập nhật nhánh thất bại: ${updateErr.message || updateRefRes.statusText}`);
        }
      } else {
        const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: newCommitSha })
        });
        if (!createRefRes.ok) {
          const createErr = await createRefRes.json().catch(() => ({})) as any;
          throw new Error(`Khởi tạo nhánh thất bại: ${createErr.message || createRefRes.statusText}`);
        }
      }

      const folderUrl = `https://github.com/${owner}/${repo}/tree/${targetBranch}/${cleanFolder}`;
      const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommitSha}`;

      res.json({
        success: true,
        commitSha: newCommitSha,
        commitShortSha: newCommitSha.substring(0, 7),
        commitUrl,
        folderUrl,
        repoUrl: `https://github.com/${owner}/${repo}`,
        filesCount: treeItems.length,
        totalRecords,
        syncedAt: nowIso,
        summary
      });
    } catch (error: any) {
      console.error('GitHub sync error:', error);
      res.status(500).json({ error: 'Đồng bộ GitHub thất bại: ' + (error.message || String(error)) });
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
