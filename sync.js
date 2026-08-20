const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    }
  }
}

loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_REPO_OWNER || 'foretissimo';

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN is not set in .env');
  process.exit(1);
}

function githubRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.github.com${endpoint}`);
    const headers = {
      'User-Agent': 'phoca-checker-sync',
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    };
    if (data) {
      headers['Content-Type'] = 'application/json';
    }

    const req = https.request(url, { method, headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ status: res.statusCode, data: json });
          }
        } catch (e) {
          reject({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function uploadOrUpdateFile(targetRepo, filePath, commitMessage) {
  const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath);
  const base64Content = content.toString('base64');

  let sha = null;
  try {
    const existing = await githubRequest('GET', `/repos/${OWNER}/${targetRepo}/contents/${encodeURIComponent(relativePath)}`);
    sha = existing.sha;
  } catch (e) {
    if (e.status !== 404) {}
  }

  const payload = {
    message: commitMessage || `Deploy: ${relativePath}`,
    content: base64Content,
    branch: 'main'
  };
  if (sha) {
    payload.sha = sha;
  }

  const result = await githubRequest('PUT', `/repos/${OWNER}/${targetRepo}/contents/${encodeURIComponent(relativePath)}`, payload);
  console.log(`[Synced -> ${targetRepo}] ${relativePath} -> Commit: ${result.commit.sha.substring(0, 7)}`);
  return result;
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (file === '.git' || file === 'node_modules' || file === '.env' || file === '.DS_Store') {
      return;
    }
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function enablePages(targetRepo) {
  console.log(`Checking GitHub Pages configuration for ${targetRepo}...`);
  try {
    const pages = await githubRequest('GET', `/repos/${OWNER}/${targetRepo}/pages`);
    console.log(`GitHub Pages is active at: ${pages.html_url}`);
    return pages;
  } catch (err) {
    if (err.status === 404) {
      console.log('Enabling GitHub Pages on branch main (/)...');
      try {
        const createRes = await githubRequest('POST', `/repos/${OWNER}/${targetRepo}/pages`, {
          source: { branch: 'main', path: '/' }
        });
        console.log(`GitHub Pages enabled successfully: ${createRes.html_url}`);
        return createRes;
      } catch (createErr) {
        console.warn('Pages enable note:', createErr.data?.message || createErr);
      }
    }
  }
}

async function syncToRepo(targetRepo) {
  const repoName = targetRepo || process.argv[2] || process.env.GITHUB_REPO_NAME || 'phoca_checker';
  console.log(`\n🚀 Starting sync for ${OWNER}/${repoName}...`);
  try {
    const repoInfo = await githubRequest('GET', `/repos/${OWNER}/${repoName}`);
    console.log(`Connected to: ${repoInfo.full_name} (${repoInfo.html_url})\n`);

    const filesToSync = getAllFiles(__dirname);
    console.log(`Found ${filesToSync.length} files to sync...`);

    for (const file of filesToSync) {
      const rel = path.relative(__dirname, file);
      await uploadOrUpdateFile(repoName, file, `Deploy: ${rel}`);
    }

    console.log(`\n✅ All files synced successfully to ${repoName}!`);
    await enablePages(repoName);
    console.log(`\n🎉 Site live at: https://${OWNER}.github.io/${repoName}/\n`);
  } catch (err) {
    console.error('❌ Sync failed:', err);
  }
}

if (require.main === module) {
  syncToRepo();
}

module.exports = { githubRequest, uploadOrUpdateFile, syncToRepo };
