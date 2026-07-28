// 任务清单（构建产物）——写给后端看的，不是给人看的。
// 平台服务定时读这个文件，把 md 里新增/改动的任务书 upsert 进库；
// 状态、认领、打款这些运行时数据归数据库，这里只提供 git 里那份「不变量」。
import { getCollection } from 'astro:content';

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
    }));

  return new Response(JSON.stringify({ generatedFrom: 'src/data/tasks', tasks }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
