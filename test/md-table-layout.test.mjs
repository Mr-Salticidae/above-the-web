import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const globalCss = read('../src/styles/global.css');
const jubenPage = read('../src/pages/juben/index.astro');
const markdownRenderer = read('../src/scripts/mini-markdown.js');

// 曾经的事故：档案库给 table 加了 display:block，浏览器为内部行列生成
// 「按内容收缩」的匿名表格盒。外壳（.md-table，有圆角与底色）照旧撑满整行，
// 可见表格却只占内容宽度，右侧空出几百像素。两张截图都是它。
test('markdown 表格始终包在可横向滚动的 .md-table 外壳里', () => {
  assert.match(markdownRenderer, /<div class="md-table"><table>/);
  assert.match(globalCss, /\.md-table\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(globalCss, /\.md-table table\s*\{[^}]*width:\s*100%/);
});

test('档案正文的表格规则保持 display:table + width:100%，不再退化成 block', () => {
  const rule = jubenPage.match(/:global\(\.juben-vault-doc-body table\)\s*\{([^}]*)\}/);
  assert.ok(rule, '找不到档案正文的表格样式规则');
  assert.match(rule[1], /display:\s*table/);
  assert.match(rule[1], /width:\s*100%/);
  assert.doesNotMatch(rule[1], /display:\s*block/);

  // 横向滚动只能由外壳承担；再挂到 table 上会重演「行宽按内容收缩」
  const shell = jubenPage.match(/:global\(\.juben-vault-doc-body \.md-table\)\s*\{([^}]*)\}/);
  assert.ok(shell, '找不到档案正文的表格外壳规则');
  assert.match(shell[1], /max-width:\s*100%/);
  assert.doesNotMatch(shell[1], /display:\s*block/);
});

test('全站没有任何样式再把表格降级成 display:block', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(css|astro)$/.test(entry.name)) files.push(rel);
    }
  };
  walk('../src');

  for (const file of files) {
    // 去掉注释，免得注释里的花括号把相邻规则连成一段
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of source.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      // 只管「选中的是 table 元素本身」的规则。.md-table small / .md-table th
      // 这类后代规则里的 display:block 是正常排版，不该被误判。
      const lastSelector = match[1].trim().split(',').at(-1).trim();
      const lastSimple = lastSelector.split(/\s+|>|\+|~/).filter(Boolean).at(-1) || '';
      if (!/^table(?:[:.[#][^\s]*)?$/.test(lastSimple)) continue;
      assert.doesNotMatch(
        match[2],
        /display:\s*block/,
        `${file} 的表格规则「${lastSelector}」含 display:block，会让表格按内容收缩并留出右侧空位`,
      );
    }
  }
});
