// 卷宗正文是浏览器侧渲染的（数据在私有仓库里，构建期看不到），
// 所以「表格被压成一行横杠」「frontmatter 裸奔成乱码」这类事故只能在运行时暴露。
// 这里把渲染器单独拎出来跑单测，把这两条钉死。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// account-core.js 在模块顶层就读 document/location，Node 里得先铺个最小地板
globalThis.document = { querySelector: () => null };
globalThis.location = { hostname: 'example.com' };

const { renderMarkdown } = await import('../src/scripts/mini-markdown.js');

test('白板图片组仅在档案渲染时启用，替代文字保留且转义', () => {
  const markdown = ['```whiteboard-images', '林家 <人物>|PHN2Zy8+', '玩家席|PHN2Zy8+', '```'].join('\n');
  assert.doesNotMatch(renderMarkdown(markdown), /<img/);
  const html = renderMarkdown(markdown, { whiteboardImages: true });
  assert.match(html, /<div class="md-whiteboard-images">/);
  assert.equal((html.match(/<img src="data:image\/svg\+xml;base64,PHN2Zy8\+"/g) ?? []).length, 2);
  assert.match(html, /alt="林家 &lt;人物&gt;"/);
});

test('白板图片组不接受外部地址或 HTML 属性', () => {
  const markdown = ['```whiteboard-images', '白板|https://example.com/diagram.svg', '```'].join('\n');
  const html = renderMarkdown(markdown, { whiteboardImages: true });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /白板图暂时无法显示/);
});

test('白板和案件卡只在 DM 阅读器中解析，后续卡片初始收起', () => {
  const row = '开场|发本后|画六席|手册 §5|PHN2Zy8+';
  const board = ['```whiteboard-cards', row, row, '```'].join('\n');
  assert.doesNotMatch(renderMarkdown(board), /data-whiteboard-slide/);
  const html = renderMarkdown(board, { whiteboardImages: true });
  assert.equal((html.match(/data-whiteboard-slide/g) ?? []).length, 2);
  assert.match(html, /data-whiteboard-slide hidden/);
  assert.match(html, /更新依据.*手册 §5/);

  const caseDoc = ['```case-cards', '旧案|先问谁？|结论|手册|一 → <二> → 三', '```'].join('\n');
  const caseHtml = renderMarkdown(caseDoc, { whiteboardImages: true });
  assert.match(caseHtml, /<li>一<\/li><li>&lt;二&gt;<\/li><li>三<\/li>/);
  assert.match(caseHtml, /data-whiteboard-next disabled/);
});

test('逐笔白板用独立工作区，步骤可跳转，说明与整图在同一张卡内', () => {
  const markdown = ['```whiteboard-trace', '开场|发本后|画六席|手册 §5|PHN2Zy8+', '```'].join('\n');
  assert.doesNotMatch(renderMarkdown(markdown), /<dialog/);
  const html = renderMarkdown(markdown, { whiteboardImages: true });
  assert.match(html, /<dialog class="md-whiteboard-cards md-trace-workspace"/);
  assert.match(html, /data-whiteboard-select[^>]*><option value="0">1\. 开场/);
  assert.match(html, /md-whiteboard-pan[\s\S]*?md-trace-notes[\s\S]*?照着画[\s\S]*?更新依据/);
});

test('案件工作区使用示意图与文字证据，并隔离公开渲染', () => {
  const markdown = ['```case-workspace', '旧案|先问谁？|本轮判断|手册 §9|PHN2Zy8+|物证 → <时间>', '```'].join('\n');
  assert.doesNotMatch(renderMarkdown(markdown), /<dialog/);
  const html = renderMarkdown(markdown, { whiteboardImages: true });
  assert.match(html, /md-case-workspace/);
  assert.doesNotMatch(html, /data-whiteboard-zoom|放大示意图/);
  assert.match(html, /alt="物证 → &lt;时间&gt;"/);
  assert.match(html, /先问玩家[\s\S]*核对证据[\s\S]*本轮结论/);
});

test('案件卡能展开时间线、物证与揭晓顺序，正文中的 HTML 继续转义', () => {
  const row = '旧案|先问谁？|结论|§9|PHN2Zy8+|证据链|先发生；后发生|<物证>；另一件|先问；再揭晓';
  const html = renderMarkdown(['```case-workspace', row, '```'].join('\n'), { whiteboardImages: true });
  assert.match(html, /事件还原<\/summary><ol><li>先发生<\/li><li>后发生<\/li>/);
  assert.match(html, /逐条核对物证<\/summary><ul><li>&lt;物证&gt;<\/li>/);
  assert.match(html, /DM 提示与揭晓顺序/);
});

test('现场带本只在 DM 阅读器解析，混排时只有案件组件属于白板控制器', async () => {
  const source = ['```dm-runbook', '准备|0|<开场>|发本；停页|角色本|齐了', '公聊|30|开始|计时|白板|到点', '```'].join('\n');
  assert.doesNotMatch(renderMarkdown(source), /data-run-open/);
  const cases = ['```case-workspace', '旧案|先问谁？|结论|§9|PHN2Zy8+|证据链', '```'].join('\n');
  const html = renderMarkdown(source + '\n\n' + cases, { whiteboardImages: true });
  assert.match(html, /&lt;开场&gt;/);
  assert.match(html, /<ol><li>发本<\/li><li>停页<\/li><\/ol>/);
  assert.equal((html.match(/<output>/g) ?? []).length, 1);
  assert.match(html, /<output>30:00<\/output>/);
  assert.match(html, /<dialog[^>]*md-case-workspace" data-whiteboard-deck/);
  assert.doesNotMatch(html, /<dialog[^>]*md-runbook"[^>]*data-whiteboard-deck/);
  const { mountWhiteboardCards } = await import('../src/scripts/whiteboard-cards.js');
  assert.deepEqual(mountWhiteboardCards({
    querySelectorAll(selector) {
      assert.equal(selector, '[data-whiteboard-deck]');
      return [];
    },
  }), []);
});

test('带本重点区分数字、物料和停读，正文仍然转义', () => {
  const row = '搜证|0|读到不要翻开下一页|每人 4 AP；公开虚拟轨 32/33|<物料>|强制公开不能藏';
  const html = renderMarkdown(['```dm-runbook', row, '```'].join('\n'), { whiteboardImages: true });
  assert.match(html, /is-gate">不要翻开下一页<\/mark>/);
  assert.match(html, /is-number">4 AP<\/mark>/);
  assert.match(html, /is-material">虚拟轨 32\/33<\/mark>/);
  assert.match(html, /仅 DM 查看/);
  assert.match(html, /&lt;物料&gt;/);
});

test('小剧场只突出明确标记为 DM 念的台词', () => {
  const row = '剧场|0|开场|入座|角色本|齐了|【DM 念 · 旁白】<台词>；【DM 动作】发卡；【玩家接话】介绍自己';
  const html = renderMarkdown(['```dm-runbook', row, '```'].join('\n'), { whiteboardImages: true });
  assert.match(html, /md-run-scene-speak"><strong>DM 念 · 旁白<\/strong><div>&lt;台词&gt;/);
  assert.match(html, /md-run-scene-cue"><strong>DM 动作<\/strong>/);
  assert.match(html, /md-run-scene-player"><strong>玩家接话<\/strong>/);
});

test('现场音频为各音轨生成本地选档和播放控件', () => {
  const row = '搜证|0|开始|发卡|物料|齐了|||线索一；线索二';
  const html = renderMarkdown(['```dm-runbook', row, '```'].join('\n'), { whiteboardImages: true });
  assert.equal((html.match(/<audio controls/g) ?? []).length, 2);
  assert.match(html, /type="file"[^>]*data-run-audio="线索一"/);
  assert.doesNotMatch(html, /<audio[^>]+src=/);
});

test('BGM 位于步骤外，线索录音在对应步骤内', () => {
  const row = '搜证|0|开始|发卡|物料|齐了|||BGM · 曲目~~https://example.com/track；线索一~SUQz';
  const html = renderMarkdown(['```dm-runbook', row, '```'].join('\n'), { whiteboardImages: true });
  const body = html.indexOf('class="md-run-body"');
  assert.ok(html.indexOf('data-run-audio="BGM · 曲目"') < body);
  assert.ok(html.indexOf('data-run-audio="线索一"') > body);
  assert.match(html, /src="data:audio\/mpeg;base64,SUQz"/);
});

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

// 白板示意图是 DM 照着手抄到现场白板上的施工图：中文框线一旦折行或被
// 当成表格解析，整张图就废了。渲染器给它单独挂 class，CSS 负责等宽与横滚。
test('whiteboard 代码块单独挂 md-whiteboard class，语言标记不漏进正文', () => {
  const html = renderMarkdown(['```whiteboard', '┌───┐', '└───┘', '```'].join('\n'));
  assert.match(html, /<pre class="md-whiteboard"><code>/);
  assert.match(html, /┌───┐\n└───┘/);
  assert.doesNotMatch(html, />whiteboard</);
  assert.doesNotMatch(html, /```/);
});

test('普通代码块仍是不带 class 的 pre，语言标记同样不渲染', () => {
  const html = renderMarkdown(['```js', 'const x = 1;', '```'].join('\n'));
  assert.match(html, /<pre><code>const x = 1;<\/code><\/pre>/);
  assert.ok(!html.includes('md-whiteboard'));
  assert.ok(!html.includes('>js<'));
});

test('whiteboard 保留缩进与换行，且照样转义 HTML', () => {
  const html = renderMarkdown(
    ['```whiteboard', '  第一行', '    缩进行 <b>粗</b>', '```'].join('\n'),
  );
  assert.match(html, /  第一行\n    缩进行 &lt;b&gt;粗&lt;\/b&gt;/);
  assert.ok(!html.includes('<b>'));
});

test('whiteboard 行尾对齐空格原样保留，画框不会被压歪', () => {
  // 白板图靠「每行显示宽度一致」对齐：ASCII 1 列、汉字 2 列，行尾补空格。
  // 渲染器若做 trim / 合并软换行，右边框就会参差不齐。
  const line = '|  A. 林家血缘（左上）        |  B. 孟德制药（右上）        |';
  const html = renderMarkdown(['```whiteboard', line, '```'].join('\n'));
  assert.ok(html.includes(line), '整行（含行尾空格）必须逐字保留');
  assert.doesNotMatch(html, /<p>/, '围栏内容不该被包成段落');
});

test('whiteboard 里的管道语法不被当成表格', () => {
  const html = renderMarkdown(
    ['```whiteboard', '| a | b |', '| --- | --- |', '```'].join('\n'),
  );
  assert.ok(!html.includes('md-table'), '围栏内的管道只是画框字符，不该生成表格');
  assert.match(html, /\| a \| b \|\n\| --- \| --- \|/);
});

test('白板样式保证等宽、不折行、可横滚，并压得住档案库的 scoped 规则', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /pre\.md-whiteboard[\s\S]*?white-space:\s*pre/);
  assert.match(css, /pre\.md-whiteboard[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /pre\.md-whiteboard[\s\S]*?word-break:\s*normal/);
  // scoped 的 .juben-vault-doc-body pre / code 与全局规则同优先级，必须有抬优先级的伴随选择器
  assert.match(css, /\.juben-vault-doc-body pre\.md-whiteboard/);
  assert.match(css, /\.juben-vault-doc-body pre\.md-whiteboard code/);
});
