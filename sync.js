const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

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

function computeBlobSha(buf) {
  return crypto.createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf]))
    .digest('hex');
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

async function uploadBlob(targetRepo, buffer) {
  const res = await githubRequest('POST', `/repos/${OWNER}/${targetRepo}/git/blobs`, {
    content: buffer.toString('base64'),
    encoding: 'base64'
  });
  return res.sha;
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

async function syncToRepo(targetRepo, customCommitMessage = null) {
  const repoName = targetRepo || process.argv[2] || process.env.GITHUB_REPO_NAME || 'phoca_checker';
  console.log(`\n🚀 Starting atomic single-commit sync for ${OWNER}/${repoName}...`);

  try {
    const repoInfo = await githubRequest('GET', `/repos/${OWNER}/${repoName}`);
    console.log(`Connected to: ${repoInfo.full_name} (${repoInfo.html_url})`);

    // 1. Get latest commit on main branch
    const ref = await githubRequest('GET', `/repos/${OWNER}/${repoName}/git/refs/heads/main`);
    const latestCommitSha = ref.object.sha;
    const latestCommit = await githubRequest('GET', `/repos/${OWNER}/${repoName}/git/commits/${latestCommitSha}`);
    const baseTreeSha = latestCommit.tree.sha;

    // 2. Get remote tree (recursive)
    const remoteTreeRes = await githubRequest('GET', `/repos/${OWNER}/${repoName}/git/trees/${baseTreeSha}?recursive=1`);
    const remoteBlobs = new Map();
    if (remoteTreeRes.tree && Array.isArray(remoteTreeRes.tree)) {
      for (const item of remoteTreeRes.tree) {
        if (item.type === 'blob') {
          remoteBlobs.set(item.path.normalize('NFC'), item.sha);
        }
      }
    }

    // 3. Scan local files and calculate blob SHAs
    const localFiles = getAllFiles(__dirname);
    const localMap = new Map();
    const filesToUpload = [];

    for (const filePath of localFiles) {
      const relPath = path.relative(__dirname, filePath).replace(/\\/g, '/').normalize('NFC');
      const buf = fs.readFileSync(filePath);
      const sha = computeBlobSha(buf);
      localMap.set(relPath, { filePath, buf, sha });

      const remoteSha = remoteBlobs.get(relPath);
      if (remoteSha !== sha) {
        filesToUpload.push({ relPath, filePath, buf, sha, isNew: !remoteSha });
      }
    }

    // 4. Check for deleted files (exist on remote but not locally)
    const deletedFiles = [];
    for (const [remotePath] of remoteBlobs) {
      if (!localMap.has(remotePath)) {
        deletedFiles.push(remotePath);
      }
    }

    console.log(`Total local files: ${localFiles.length}`);
    console.log(`Remote blobs: ${remoteBlobs.size}`);
    console.log(`Changed / New files: ${filesToUpload.length}`);
    console.log(`Deleted files: ${deletedFiles.length}`);

    // If no changes, exit without creating a commit or triggering Actions
    if (filesToUpload.length === 0 && deletedFiles.length === 0) {
      console.log(`\n✨ Everything is already up to date! (0 files changed)`);
      console.log(`⏩ No commits created, skipping GitHub Actions build.`);
      await enablePages(repoName);
      console.log(`\n🎉 Site live at: https://${OWNER}.github.io/${repoName}/\n`);
      return;
    }

    // 5. Upload new/changed blobs
    console.log(`\n📦 Uploading ${filesToUpload.length} blob(s)...`);
    const treeEntries = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const item = filesToUpload[i];
      process.stdout.write(`  [${i + 1}/${filesToUpload.length}] Uploading ${item.relPath}... `);
      const blobSha = await uploadBlob(repoName, item.buf);
      treeEntries.push({
        path: item.relPath,
        mode: '100644',
        type: 'blob',
        sha: blobSha
      });
      console.log(`done (${blobSha.substring(0, 7)})`);
    }

    // Add deleted entries (sha: null deletes from tree)
    for (const delPath of deletedFiles) {
      console.log(`  🗑️ Removing deleted file: ${delPath}`);
      treeEntries.push({
        path: delPath,
        mode: '100644',
        type: 'blob',
        sha: null
      });
    }

    // 6. Create single new tree layered on base_tree
    console.log('\n🌲 Creating new Git tree...');
    const newTree = await githubRequest('POST', `/repos/${OWNER}/${repoName}/git/trees`, {
      base_tree: baseTreeSha,
      tree: treeEntries
    });
    console.log(`Tree created: ${newTree.sha.substring(0, 7)}`);

    // 7. Create single commit
    const defaultMsg = `Deploy: ${filesToUpload.length} file(s) updated, ${deletedFiles.length} removed`;
    const message = customCommitMessage || defaultMsg;
    console.log(`\n📝 Creating commit: "${message}"...`);
    const newCommit = await githubRequest('POST', `/repos/${OWNER}/${repoName}/git/commits`, {
      message,
      tree: newTree.sha,
      parents: [latestCommitSha]
    });
    console.log(`Commit created: ${newCommit.sha.substring(0, 7)}`);

    // 8. Update main branch reference to point to new commit
    console.log('🔗 Updating main branch ref...');
    await githubRequest('PATCH', `/repos/${OWNER}/${repoName}/git/refs/heads/main`, {
      sha: newCommit.sha
    });

    console.log(`\n✅ Successfully deployed to ${repoName} in exactly 1 commit!`);
    console.log(`⚡ Only 1 GitHub Actions workflow run triggered!`);

    await enablePages(repoName);
    console.log(`\n🎉 Site live at: https://${OWNER}.github.io/${repoName}/\n`);
  } catch (err) {
    console.error('❌ Sync failed:', err);
  }
}

if (require.main === module) {
  syncToRepo();
}

module.exports = { githubRequest, syncToRepo };
