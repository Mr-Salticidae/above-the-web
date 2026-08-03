// 任务清单（构建产物）——写给后端看的，不是给人看的。
// 平台服务定时读这个文件，把 md 里新增/改动的任务书 upsert 进库；
// 状态、认领、打款这些运行时数据归数据库，这里只提供 git 里那份「不变量」。
import { getCollection } from 'astro:content';

// 正文节选。服务端读不到 git 里的 markdown，但 AI 帮申请者写自荐说明时得知道
// 这活儿到底要干什么，所以清单里捎一段纯文本过去（存进 tasks.outline）。
// 去掉链接语法和强调符号，只留字面意思——送进模型的是内容，不是排版。
const OUTLINE_LIMIT = 2400;

function outlineOf(markdown) {
  const text = String(markdown ?? '')
    // 换行先归一：md 是 CRLF 存的，只按 \n 处理会在节选里留一地孤零零的 \r
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')          // 代码块整段丢掉
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // 图片只剩噪音
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // 链接留文字
    .replace(/^[ \t]*>[ \t]?/gm, '')          // 引用符号，但空行留着——分段是语义
    .replace(/\*\*|`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > OUTLINE_LIMIT ? `${text.slice(0, OUTLINE_LIMIT)}…` : text;
}

export async function GET() {
  const tasks = (await getCollection('tasks'))
    .sort((a, b) => b.data.date.localeCompare(a.data.date))
    .map((t) => ({
      slug: t.id,
      title: t.data.title,
      summary: t.data.summary,
      date: t.data.date,
      deadline: t.data.deadline ?? '',
      fee: t.data.fee ?? '',
      // md 里的 status/taker 只作为首次入库的初值，之后一律以数据库为准
      status: t.data.status,
      taker: t.data.taker ?? '',
      deliverable: t.data.deliverable ?? '',
      outline: outlineOf(t.body),
    }));

  return new Response(JSON.stringify({ generatedFrom: 'src/data/tasks', tasks }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
