// git.js
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
require('dotenv').config();

const REPO_DIR = path.resolve(process.env.IMG_REPO_DIR || 'repo/DatabaseImg');
const PARENT_DIR = path.dirname(REPO_DIR);
const BRANCH = process.env.GIT_BRANCH || 'main';

function makeAuthRemote() {
  const remote = process.env.GIT_REMOTE; // e.g. https://github.com/Beam4989/DatabaseImg.git
  const token = process.env.GIT_TOKEN;
  if (!remote || !token) throw new Error('Missing GIT_REMOTE or GIT_TOKEN in .env');
  const u = new URL(remote);
  // ใช้ token ใส่เป็น username เพื่อหลีกเลี่ยงการโชว์ user จริงใน URL
  u.username = token;
  u.password = ''; // ไม่ต้องใส่
  return u.toString(); // https://<TOKEN>@github.com/Beam4989/DatabaseImg.git
}

async function isGitRepo(dir) {
  try {
    const git = simpleGit(dir);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

async function initialCommitIfEmpty(dir) {
  const git = simpleGit(dir);
  // ถ้าไม่มีไฟล์อะไรเลย ให้สร้าง .gitkeep
  const items = fs.readdirSync(dir).filter(n => n !== '.git');
  if (items.length === 0) {
    fs.writeFileSync(path.join(dir, '.gitkeep'), '');
    await git.add('.gitkeep');
    await git.commit('chore: initial commit');
  }
}

async function ensureRepo() {
  const authRemote = makeAuthRemote();

  // สร้างโฟลเดอร์พ่อก่อน
  if (!fs.existsSync(PARENT_DIR)) fs.mkdirSync(PARENT_DIR, { recursive: true });

  // ถ้ายังไม่มีโฟลเดอร์ repo → ลอง clone จากโฟลเดอร์พ่อ
  if (!fs.existsSync(REPO_DIR)) {
    try {
      const g = simpleGit(PARENT_DIR);
      await g.clone(authRemote, REPO_DIR); // ให้ git สร้างโฟลเดอร์ปลายทางเอง
    } catch (e) {
      // ถ้าคลอนไม่ได้ (เช่น repo ยังว่างมาก ๆ) → init ใหม่แล้วผูก remote
      fs.mkdirSync(REPO_DIR, { recursive: true });
      const g2 = simpleGit(REPO_DIR);
      await g2.init();
      await g2.addRemote('origin', authRemote);
    }
  }

  // ถ้ามีโฟลเดอร์แล้ว แต่ยังไม่ใช่ git repo → init
  if (!(await isGitRepo(REPO_DIR))) {
    const g3 = simpleGit(REPO_DIR);
    await g3.init();
    await g3.addRemote('origin', authRemote).catch(() => {});
  }

  const git = simpleGit(REPO_DIR);

  // ตั้งค่า user ใน repo นี้เท่านั้น
  if (process.env.GIT_USER) await git.addConfig('user.name', process.env.GIT_USER);
  if (process.env.GIT_EMAIL) await git.addConfig('user.email', process.env.GIT_EMAIL);

  // checkout สาขาเป้าหมาย
  try {
    await git.fetch(['origin']);
    await git.checkout(BRANCH);
    await git.pull('origin', BRANCH);
  } catch {
    // ถ้ายังไม่มีสาขา → สร้างสาขาใหม่
    await git.checkoutLocalBranch(BRANCH);
  }

  // ถ้าโลคัลยังไม่มีไฟล์ → commit แรก
  await initialCommitIfEmpty(REPO_DIR);

  // พยายาม push ให้แน่ใจว่ามีสาขาบน remote
  try {
    await git.push(['-u', 'origin', BRANCH]);
  } catch {
    // เงียบไว้ถ้าสร้างแล้ว
  }

  return git;
}

async function commitAdd(fileRelPath, message) {
  const git = await ensureRepo();
  await git.add(fileRelPath);
  await git.commit(message || `Add ${fileRelPath}`);
  await git.push('origin', BRANCH);
}

async function commitRemove(fileRelPath, message) {
  const git = await ensureRepo();
  // ลบเงียบ ๆ ถ้าไฟล์ไม่มีใน working tree
  try {
    await git.rm(fileRelPath);
  } catch {
    // ข้ามไป
  }
  await git.commit(message || `Remove ${fileRelPath}`);
  await git.push('origin', BRANCH);
}

function toRawUrl(fileRelPath) {
  // https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path>
  const user = process.env.GIT_REMOTE.split('/')[3]; // github.com/<user>/<repo>.git
  const repo = process.env.GIT_REMOTE.split('/').pop().replace('.git', '');
  return `https://raw.githubusercontent.com/${user}/${repo}/${BRANCH}/${fileRelPath.replace(/\\/g,'/')}`;
}

module.exports = { ensureRepo, commitAdd, commitRemove, toRawUrl, REPO_DIR };
