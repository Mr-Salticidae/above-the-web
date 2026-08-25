// 构建期把音乐 manifest 导出成 /music/playlist.json。
// 音频与封面走香港服务器 /music/ 静态目录（nginx alias，见 platform/deploy/nginx-music.conf），
// 不进 git 仓库；用绝对地址指向主站，GitHub Pages 镜像同样可播。
// 字段：title 歌名 / artist 艺术家 / audio 音频文件名 / cover 封面文件名(可选) /
//       duration 秒(可选，播放条初始显示用) / note 一句话备注(可选)

export async function GET() {
  const manifest = (await import('../../data/music/manifest.json')).default;
  const ORIGIN = 'https://tiaozhuxiansheng.com/music';
  const tracks = (manifest.tracks || []).map((t, i) => ({
    id: t.id || `track-${i + 1}`,
    title: t.title || '未命名',
    artist: t.artist || '跳蛛先生',
    audio: `${ORIGIN}/audio/${encodeURIComponent(t.audio)}`,
    cover: t.cover ? `${ORIGIN}/covers/${encodeURIComponent(t.cover)}` : null,
    duration: Number(t.duration) || 0,
    note: t.note || '',
  }));

  return new Response(JSON.stringify({ tracks }, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
