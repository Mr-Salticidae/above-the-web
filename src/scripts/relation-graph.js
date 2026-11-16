// 人物关系图：DM 档案库里的 relation-graph 代码块。
//
// 定位是「照着抄」的施工图，不是炫技的力导向玩具：
// 版式沿用官方白板四区（A 林家 / B 姻亲与外围 / C 七名死者 / D 六席与结论），
// 节点与连线全部写死坐标，手绘时同一位置、同一笔顺，抄出来能对上现场白板。
// 数据以 JSON 放在 fence 里，跟着正文一起从服务端鉴权下发；本模块只负责画。
import { escapeHtml } from './account-core.js';

// 四区边框与标题
const ZONES = [
  { id: 'A', x: 24, y: 80, w: 700, h: 430, title: 'A · 林家主干与旧案人', note: '血缘、婚姻、恋人三条支线，先画这一块' },
  { id: 'B', x: 744, y: 80, w: 632, h: 430, title: 'B · 制药、江家、温家、于家', note: '外姓姻亲与共事关系，第二轮补' },
  { id: 'C', x: 24, y: 530, w: 700, h: 236, title: 'C · 2015.08.15 七名死者', note: '按现场与死亡时间分三组，别按亲疏分组' },
  { id: 'D', x: 744, y: 530, w: 632, h: 236, title: 'D · 2020 六席与四重改写', note: '席位只有六个，徐光由 DM 扮演' },
];

const EDGE_KINDS = {
  kin: { cls: 'rg-l-kin', dash: '', note: '亲缘（实线）' },
  marriage: { cls: 'rg-l-marriage', dash: '', note: '婚姻（双线）' },
  lover: { cls: 'rg-l-lover', dash: '6 5', note: '恋人（细虚线）' },
  affair: { cls: 'rg-l-affair', dash: '4 4', note: '秘密关系（赤虚线）' },
  work: { cls: 'rg-l-work', dash: '1 4', note: '从属 / 共事（点线）' },
  kill: { cls: 'rg-l-kill', dash: '', note: '杀害（红箭头）' },
};

const LAYERS = [
  { value: 0, label: '开场' },
  { value: 1, label: '第一重' },
  { value: 2, label: '第二重' },
  { value: 3, label: '第三重' },
];

let graphSeq = 0;

function txt(value) {
  return escapeHtml(String(value ?? ''));
}

function nodeWidth(node) {
  return node.w ?? 112;
}

// 连线走直线，需要避让时由数据给 bend：法线方向的偏移像素
function edgePath(a, b, bend = 0) {
  if (!bend) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const nx = -dy / len;
  const ny = dx / len;
  return `M ${a.x} ${a.y} Q ${mx + nx * bend} ${my + ny * bend} ${b.x} ${b.y}`;
}

function edgeLabelAt(a, b, bend = 0) {
  if (!bend) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: (a.x + b.x) / 2 + (-dy / len) * bend * 0.5,
    y: (a.y + b.y) / 2 + (dx / len) * bend * 0.5,
  };
}

function renderNodes(nodes, layerMax) {
  return nodes.map((node) => {
    const w = nodeWidth(node);
    const h = 46;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const marks = [];
    if (node.seat) {
      marks.push(`<circle class="rg-seat" cx="${x + w - 9}" cy="${y + 9}" r="4.2" />`);
    }
    if (node.dead) {
      marks.push(`<text class="rg-cross" x="${x + 10}" y="${y + 14}">†</text>`);
    }
    const role = node.sub ? `<text class="rg-sub" x="${node.x}" y="${node.y + 13}">${txt(node.sub)}</text>` : '';
    return `<g class="rg-node${node.dead ? ' is-dead' : ''}${node.seat ? ' is-seat' : ''}" data-id="${txt(node.id)}" data-group="${txt(node.group || 'lin')}" data-rg-layer="${node.layer ?? 0}" tabindex="0" role="button" aria-label="${txt(node.name)}${node.sub ? '，' + txt(node.sub) : ''}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" />
      <text class="rg-name" x="${node.x}" y="${node.y - 1}">${txt(node.name)}</text>
      ${role}
      ${marks.join('')}
    </g>`;
  }).join('\n');
}

function renderEdges(edges, byId) {
  return edges.map((edge, index) => {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) return '';
    const kind = EDGE_KINDS[edge.kind] || EDGE_KINDS.kin;
    const bend = edge.bend ?? 0;
    const path = edgePath(a, b, bend);
    const dash = edge.dash ?? kind.dash;
    const arrow = edge.kind === 'kill' ? ' marker-end="url(#rg-arrow)"' : '';
    const double = edge.kind === 'marriage'
      ? `<path class="rg-edge rg-l-marriage rg-double" d="${path}" transform="translate(0 3)" />`
      : '';
    const label = edge.label
      ? (() => {
          const pos = edgeLabelAt(a, b, bend);
          const width = edge.label.length * 9.5 + 8;
          return `<g class="rg-edge-label" data-rg-layer="${edge.layer ?? 0}" data-edge="${index}">
            <rect x="${pos.x - width / 2}" y="${pos.y - 8}" width="${width}" height="16" rx="3" />
            <text x="${pos.x}" y="${pos.y}" >${txt(edge.label)}</text>
          </g>`;
        })()
      : '';
    return `<g class="rg-edge-group" data-edge="${index}" data-from="${txt(edge.from)}" data-to="${txt(edge.to)}" data-rg-layer="${edge.layer ?? 0}">
      <path class="rg-edge ${kind.cls}" d="${path}"${dash ? ` stroke-dasharray="${dash}"` : ''}${arrow} />
      ${double}
    </g>${label}`;
  }).join('\n');
}

function legend() {
  return `<div class="rg-legend">
    <span><i class="rg-swatch rg-swatch-kin"></i>亲缘</span>
    <span><i class="rg-swatch rg-swatch-marriage"></i>婚姻</span>
    <span><i class="rg-swatch rg-swatch-lover"></i>恋人</span>
    <span><i class="rg-swatch rg-swatch-affair"></i>秘密</span>
    <span><i class="rg-swatch rg-swatch-work"></i>从属</span>
    <span><i class="rg-swatch rg-swatch-kill"></i>杀害</span>
    <span><b class="rg-dot"></b>玩家席</span>
    <span class="rg-dagger">† 死者</span>
    <span class="rg-legend-hint">手绘时按这六种线型区分，别另造符号</span>
  </div>`;
}

function zoneFrames() {
  return ZONES.map((zone) => `<g class="rg-zone">
    <rect x="${zone.x}" y="${zone.y}" width="${zone.w}" height="${zone.h}" rx="10" />
    <text class="rg-zone-title" x="${zone.x + 18}" y="${zone.y + 26}">${txt(zone.title)}</text>
    <text class="rg-zone-note" x="${zone.x + 18}" y="${zone.y + 44}">${txt(zone.note)}</text>
  </g>`).join('\n');
}

function listBlock(items, x, y, { cols = 2, gapX = 150, gapY = 34 } = {}) {
  return items.map((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return `<g class="rg-chip"><rect x="${x + col * gapX}" y="${y + row * gapY}" width="132" height="26" rx="5" />
      <text x="${x + col * gapX + 10}" y="${y + row * gapY + 17}">${txt(item)}</text></g>`;
  }).join('\n');
}

export function renderRelationGraph(rows) {
  const raw = rows.join('\n').trim();
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch {
    return '<p class="md-relation-fallback">关系图数据无法解析，请参考下方关系清单。</p>';
  }
  const nodes = Array.isArray(spec.nodes) ? spec.nodes.filter((node) => node && node.id && Number.isFinite(node.x)) : [];
  if (!nodes.length) return '<p class="md-relation-fallback">关系图数据为空。</p>';
  const edges = Array.isArray(spec.edges) ? spec.edges : [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  graphSeq += 1;
  const gid = `rg${graphSeq}`;
  const title = spec.title || '人物关系图';
  const subtitle = spec.subtitle || '';

  const arrowMarker = `<defs><marker id="rg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" class="rg-arrow-head" />
    </marker></defs>`;

  return `<figure class="md-relation-graph" data-rg="${gid}" data-rg-layer="3">
  <figcaption>
    <p class="rg-title">${txt(title)}</p>
    ${subtitle ? `<p class="rg-subtitle">${txt(subtitle)}</p>` : ''}
  </figcaption>
  <div class="rg-toolbar" role="group" aria-label="按真相层查看">
    <span class="rg-toolbar-label">看哪一层</span>
    ${LAYERS.map((layer) => `<button type="button" class="rg-layer-btn${layer.value === 3 ? ' is-active' : ''}" data-rg-set-layer="${layer.value}" aria-pressed="${layer.value === 3}">${layer.label}</button>`).join('')}
    <span class="rg-toolbar-tip">默认全开；点「第一重」起可照着逐层补线</span>
  </div>
  <div class="rg-canvas">
    <svg viewBox="0 0 1400 790" role="img" aria-label="${txt(title)}">
      ${arrowMarker}
      ${zoneFrames()}
      <g class="rg-edges">${renderEdges(edges, byId)}</g>
      <g class="rg-nodes">${renderNodes(nodes, 3)}</g>
      ${spec.dead ? listBlock(spec.dead, 44, 598, { cols: 4, gapX: 170, gapY: 34 }) : ''}
      ${spec.seats ? listBlock(spec.seats, 764, 598, { cols: 3, gapX: 170, gapY: 34 }) : ''}
      ${spec.groups ? `<g class="rg-conclusion">${spec.groups.map((line, index) =>
        `<text x="44" y="${686 + index * 19}">${txt(line)}</text>`).join('')}</g>` : ''}
      ${spec.conclusion ? `<g class="rg-conclusion">${spec.conclusion.map((line, index) =>
        `<text x="764" y="${686 + index * 19}">${txt(line)}</text>`).join('')}</g>` : ''}
    </svg>
  </div>
  ${legend()}
  <div class="rg-inspector" hidden><p class="rg-inspector-empty">点任意人物，看他在这张网里的所有连线。</p></div>
  <script type="application/json" class="rg-spec">${raw.replace(/</g, '\\u003c')}</script>
</figure>`;
}

// 交互：层过滤、点人物看连线。挂在 innerHTML 之后。
export function mountRelationGraphs(root) {
  const figures = root.querySelectorAll('[data-rg]');
  figures.forEach((figure) => {
    if (figure.dataset.rgBound) return;
    figure.dataset.rgBound = '1';
    let spec = null;
    try {
      spec = JSON.parse(figure.querySelector('.rg-spec')?.textContent || '{}');
    } catch {
      spec = null;
    }
    const inspector = figure.querySelector('.rg-inspector');
    const emptyText = inspector?.innerHTML || '';

    const applyLayer = (max) => {
      figure.dataset.rgLayer = String(max);
      figure.querySelectorAll('[data-rg-layer]').forEach((el) => {
        const level = Number(el.getAttribute('data-rg-layer') || 0);
        el.classList.toggle('is-off', level > max);
      });
      figure.querySelectorAll('[data-rg-set-layer]').forEach((btn) => {
        const active = Number(btn.dataset.rgSetLayer) === max;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      clearActive();
    };

    const clearActive = () => {
      figure.querySelectorAll('.rg-node.is-active, .rg-edge-group.is-active, .rg-edge-label.is-active').forEach((el) => {
        el.classList.remove('is-active');
        el.classList.remove('is-dim');
      });
      if (inspector) {
        inspector.hidden = true;
        inspector.innerHTML = emptyText;
      }
    };

    const focusNode = (id) => {
      const node = spec?.nodes?.find((item) => item.id === id);
      if (!node) return;
      clearActive();
      figure.querySelectorAll('.rg-node').forEach((el) => {
        el.classList.toggle('is-active', el.dataset.id === id);
        el.classList.toggle('is-dim', el.dataset.id !== id);
      });
      const related = [];
      figure.querySelectorAll('.rg-edge-group').forEach((el) => {
        const hit = el.dataset.from === id || el.dataset.to === id;
        el.classList.toggle('is-active', hit);
        el.classList.toggle('is-dim', !hit);
        if (!hit) return;
        const edge = spec.edges[Number(el.dataset.edge)];
        const otherId = edge.from === id ? edge.to : edge.from;
        const other = spec.nodes.find((item) => item.id === otherId);
        related.push(`<li><b>${txt(other?.name || otherId)}</b><span>${txt(edge.label || '')}</span></li>`);
      });
      figure.querySelectorAll('.rg-edge-label').forEach((el) => {
        const edge = spec.edges[Number(el.dataset.edge)];
        el.classList.toggle('is-dim', !(edge && (edge.from === id || edge.to === id)));
      });
      if (inspector) {
        inspector.hidden = false;
        inspector.innerHTML = `<div class="rg-inspector-head">
            <p class="rg-inspector-name">${txt(node.name)}</p>
            <p class="rg-inspector-sub">${txt(node.sub || '')}</p>
          </div>
          ${node.note ? `<p class="rg-inspector-note">${txt(node.note)}</p>` : ''}
          ${related.length ? `<ul class="rg-inspector-list">${related.join('')}</ul>` : '<p class="rg-inspector-empty">这个人暂时没有连线。</p>'}`;
      }
    };

    figure.querySelectorAll('[data-rg-set-layer]').forEach((btn) => {
      btn.addEventListener('click', () => applyLayer(Number(btn.dataset.rgSetLayer)));
    });
    figure.querySelectorAll('.rg-node').forEach((el) => {
      el.addEventListener('click', () => focusNode(el.dataset.id));
      el.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          focusNode(el.dataset.id);
        }
      });
    });
    figure.querySelector('.rg-canvas')?.addEventListener('click', (event) => {
      if (!event.target.closest('.rg-node')) clearActive();
    });
    applyLayer(3);
  });
}
