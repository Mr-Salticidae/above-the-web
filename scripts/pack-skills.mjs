// Skill 一键下载打包：把 kb-content/07_skill存档/ 下每个带 SKILL.md 的技能文件夹，
// 打成一个可直接解压进 Agent 技能目录的 zip（public/skills/<name>.zip），
// 另出一份全量包 all-skills.zip，并写清单 src/data/skills.generated.json 给页面用。
//
// 文件内容一律取 git 原件：sync 的 clean() 会把工作区 SKILL.md 的 frontmatter 归一成
// 只剩 tags/title（给 Astro 的 schema 用），name/description 一丢，解压出来的就不是合法 Skill 了。
// 只打 git 跟踪的文件（ls-tree），工作区里的临时文件、.env 之类一概不进包。
//
// 体积纪律：zip 是给读者「拿去就能用」的，不是素材仓库的镜像——
// 视频/音频/PSD/嵌套 zip、单个超过 1.5MB 的文件一律跳过，清单里记下跳过了什么，
// 页面上提示「完整素材在 GitHub」。零依赖：zip 容器自己写（deflate 用 node:zlib）。

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { slugify } from '../src/lib/slug.mjs';

export const SKILL_TOP = '07_skill存档';
export const SKILLS_PUB = path.join('public', 'skills');
export const SKILLS_MANIFEST = path.join('src', 'data', 'skills.generated.json');

const MAX_FILE = 1.5 * 1024 * 1024;
const SKIP_EXT = /\.(mp4|mov|webm|mkv|mp3|wav|m4a|flac|aac|psd|zip|7z|rar|exe|dll)$/i;
const SKIP_PATH = /(^|\/)(node_modules|\.git|out|dist)(\/|$)|(^|\/)\.env(?!\.example$)[^/]*$/i;

// ---------- 极简 frontmatter 解析（只要 name / description，兼容 >- / | 块标量） ----------
export function parseSkillFrontmatter(text) {
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!t.startsWith('---')) return {};
  const end = t.indexOf('\n---', 3);
  if (end === -1) return {};
  const lines = t.slice(3, end).split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(name|description|version):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^[>|][+-]?$/.test(v)) {
      const buf = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        buf.push(lines[++i].trim());
      }
      v = buf.join(v.startsWith('|') ? '\n' : ' ').trim();
    }
    out[m[1]] = v.replace(/^["']|["']$/g, '');
  }
  return out;
}

// ---------- zip 写入（store/deflate 自选，UTF-8 文件名，固定时间戳保证可复现） ----------
const CRC_TABLE = (() => {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tbl[n] = c >>> 0;
  }
  return tbl;
})();
function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// DOS 时间：2026-01-01 00:00（内容不变 → zip 字节不变，CDN/浏览器缓存才有意义）
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // bit 11：文件名为 UTF-8（中文文件名不乱码）
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(DOS_TIME, 10);
    lh.writeUInt16LE(DOS_DATE, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, body);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(DOS_TIME, 12);
    ch.writeUInt16LE(DOS_DATE, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);

    offset += lh.length + nameBuf.length + body.length;
  }
  const cdSize = centrals.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, eocd]);
}

// ---------- 主流程 ----------
// 一律从 git 对象读原件（HEAD:path），不读工作区：工作区的 .md 会被 sync 的 clean() 改写，
// 而 zip 里必须是作者提交的原样文件。cat-file --batch 一次批量读完，不逐个起进程。
function readBlobs(kbDir, rels) {
  if (!rels.length) return new Map();
  const buf = execFileSync('git', ['-C', kbDir, 'cat-file', '--batch'], {
    input: rels.map((r) => `HEAD:${r}`).join('\n') + '\n',
    maxBuffer: 512 * 1024 * 1024,
  });
  const map = new Map();
  let pos = 0;
  for (const rel of rels) {
    const nl = buf.indexOf(0x0a, pos);
    const header = buf.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    const m = header.match(/^\S+ blob (\d+)$/);
    if (!m) continue; // missing
    const size = Number(m[1]);
    map.set(rel, buf.subarray(pos, pos + size));
    pos += size + 1; // 内容后跟一个换行
  }
  return map;
}

function trackedFiles(kbDir, folder) {
  const out = execFileSync(
    'git',
    ['-C', kbDir, '-c', 'core.quotepath=off', 'ls-tree', '-r', '-l', '-z', 'HEAD', '--', `${SKILL_TOP}/${folder}/`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return out
    .split('\0')
    .filter(Boolean)
    .map((rec) => {
      const m = rec.match(/^\S+ blob \S+\s+(\d+)\t(.+)$/s);
      return m ? { size: Number(m[1]), rel: m[2] } : null;
    })
    .filter(Boolean);
}

export function packSkills({ kbDir = 'kb-content', log = console.log } = {}) {
  const root = path.join(kbDir, SKILL_TOP);
  if (!fs.existsSync(root)) {
    log(`[skills] 未找到 ${root}，跳过打包`);
    return [];
  }
  fs.rmSync(SKILLS_PUB, { recursive: true, force: true });
  fs.mkdirSync(SKILLS_PUB, { recursive: true });

  const skills = [];
  const allEntries = [];
  const folders = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'SKILL.md')))
    .map((d) => d.name)
    .sort();

  for (const folder of folders) {
    const prefix = `${SKILL_TOP}/${folder}/`;
    const keep = [];
    const skipped = [];
    for (const { rel, size } of trackedFiles(kbDir, folder)) {
      const inner = rel.slice(prefix.length);
      if (SKIP_PATH.test(inner) || SKIP_EXT.test(inner) || size > MAX_FILE) skipped.push({ path: inner, size });
      else keep.push(rel);
    }
    const blobs = readBlobs(kbDir, keep);
    const skillBlob = blobs.get(`${prefix}SKILL.md`);
    if (!skillBlob) {
      log(`[skills] ${folder}: SKILL.md 未入库，跳过`);
      continue;
    }
    const skillMd = skillBlob.toString('utf8');
    const fm = parseSkillFrontmatter(skillMd);
    // zip 根目录与下载文件名都用 frontmatter name：Agent 加载器认的是它，不是文件夹名
    const name = /^[a-z0-9][a-z0-9-]{0,63}$/i.test(fm.name || '') ? fm.name : folder;
    const h1 = skillMd.match(/^#\s+(.+)$/m);

    const entries = [];
    let bytes = 0;
    for (const rel of keep) {
      const data = blobs.get(rel);
      if (!data) continue;
      entries.push({ name: `${name}/${rel.slice(prefix.length)}`, data });
      bytes += data.length;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    const zip = buildZip(entries);
    const file = `${name}.zip`;
    fs.writeFileSync(path.join(SKILLS_PUB, file), zip);
    allEntries.push(...entries);

    skills.push({
      name,
      folder,
      title: h1 ? h1[1].trim() : name,
      description: fm.description || '',
      version: fm.version || null,
      file,
      zipBytes: zip.length,
      bytes,
      fileCount: entries.length,
      skipped,
      noteSlug: slugify(`${SKILL_TOP}/${folder}/SKILL.md`),
      readmeSlug: fs.existsSync(path.join(root, folder, 'README.md')) ? slugify(`${SKILL_TOP}/${folder}/README.md`) : null,
    });
  }

  const all = buildZip(allEntries);
  fs.writeFileSync(path.join(SKILLS_PUB, 'all-skills.zip'), all);

  fs.mkdirSync(path.dirname(SKILLS_MANIFEST), { recursive: true });
  fs.writeFileSync(
    SKILLS_MANIFEST,
    JSON.stringify({ generatedAt: new Date().toISOString(), allZipBytes: all.length, skills }, null, 2),
  );
  const skippedN = skills.reduce((s, k) => s + k.skipped.length, 0);
  log(`[skills] 已打包 ${skills.length} 个 Skill → ${SKILLS_PUB}（全量包 ${(all.length / 1024).toFixed(0)} KB，跳过大文件/媒体 ${skippedN} 个）`);
  return skills;
}

// 单独跑：node scripts/pack-skills.mjs（需 kb-content 已同步；读的是 git 原件，clean 与否不影响）
if (process.argv[1] && path.basename(process.argv[1]) === 'pack-skills.mjs') {
  packSkills();
}
