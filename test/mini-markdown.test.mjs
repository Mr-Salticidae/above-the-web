// 卷宗正文是浏览器侧渲染的（数据在私有仓库里，构建期看不到），
// 所以「表格被压成一行横杠」「frontmatter 裸奔成乱码」这类事故只能在运行时暴露。
// 这里把渲染器单独拎出来跑单测，把这两条钉死。
import test from 'node:test';
import assert from 'node:assert/strict';

// account-core.js 在模块顶层就读 document/location，Node 里得先铺个最小地板
globalThis.document = { querySelector: () => null };
globalThis.location = { hostname: 'example.com' };

const { renderMarkdown } = await import('../src/scripts/mini-markdown.js');

test('GFM 表格渲染成真正的 table，而不是一行管道横杠', () => {
  const html = renderMarkdown(
    ['| 文件 | 用途 |', '| --- | --- |', '| 00_对外学习包/ | 可直接转发 |', '| 07_归纳卡片.md | 五维归纳 |'].join('\n'),
  );
  assert.match(html, /<div class="md-table">/);
  assert.match(html, /<th>文件<\/th>/);
  assert.match(html, /<td>00_对外学习包\/<\/td>/);
  assert.equal((html.match(/<tr>/g) ?? []).length, 3, '表头一行 + 数据两行');
  assert.ok(!/\|\s*---/.test(html), '分隔行不该漏进正文');
});

test('表格对齐标记转成 text-align，且列数不齐时补空格子', () => {
  const html = renderMarkdown(['| 左 | 中 | 右 |', '| :-- | :-: | --: |', '| a | b |', '| 1 | 2 | 3 |'].join('\n'));
  assert.match(html, /<th style="text-align:left">左<\/th>/);
  assert.match(html, /<th style="text-align:center">中<\/th>/);
  assert.match(html, /<th style="text-align:right">右<\/th>/);
  assert.match(html, /<td style="text-align:right"><\/td>/, '缺列补空 td，列数不塌');
});

test('转义管道留在单元格里，不当列分隔', () => {
  const html = renderMarkdown(['| 语法 | 说明 |', '| --- | --- |', '| a \\| b | 或 |'].join('\n'));
  assert.match(html, /<td>a \| b<\/td>/);
});

test('表格单元格里的行内语法照常生效', () => {
  const html = renderMarkdown(['| 项 | 备注 |', '| --- | --- |', '| **必看** | `00_读我` |'].join('\n'));
  assert.match(html, /<strong>必看<\/strong>/);
  assert.match(html, /<code>00_读我<\/code>/);
});

test('表格之后的正文不被吞进表格', () => {
  const html = renderMarkdown(['| a | b |', '| --- | --- |', '| 1 | 2 |', '', '表格后的段落'].join('\n'));
  assert.match(html, /<\/table><\/div>/);
  assert.match(html, /<p>表格后的段落<\/p>/);
});

test('frontmatter 整块剥掉，不当正文渲染', () => {
  const html = renderMarkdown(
    ['---', 'id: "247"', 'name: "窗边的女人"', 'players: 6', '---', '', '## 正文标题', '', '正文。'].join('\n'),
  );
  assert.ok(!html.includes('id:'), 'frontmatter 不该出现在正文里');
  assert.ok(!html.includes('players:'), 'frontmatter 不该出现在正文里');
  assert.equal((html.match(/<hr \/>/g) ?? []).length, 0, '分隔线也被一并吃掉');
  assert.match(html, /<h2>正文标题<\/h2>/);
});

test('单个 | 开头的普通行不误判成表格', () => {
  const html = renderMarkdown('| 这只是正文里的一根竖线，没有分隔行');
  assert.ok(!html.includes('md-table'));
  assert.match(html, /<p>/);
});

test('表格里的 HTML 仍然被转义', () => {
  const html = renderMarkdown(['| x | y |', '| --- | --- |', '| <img src=x onerror=1> | ok |'].join('\n'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /&lt;img/);
});
