import { getConfig } from "./config.js";
import { createApplication } from "./app.js";

const config = getConfig();

if (config.mode === "production" && config.admin.password === "change-this-before-production") {
  console.error("[atw-platform] 拒绝启动：生产模式下必须设置 ATW_ADMIN_PASSWORD");
  process.exit(1);
}

const { server, database, taskSync } = createApplication(config);

taskSync.start();

// 过期会话与用剩的重置票每天清一次，库里不留死数据
const sessionCleanup = setInterval(() => {
  database.purgeExpiredSessions();
  database.purgeExpiredPasswordResets();
}, 24 * 60 * 60 * 1000);
sessionCleanup.unref?.();

server.listen(config.port, config.host, () => {
  console.log(`[atw-platform] ${config.mode} 模式，监听 http://${config.host}:${config.port}`);
  console.log(`[atw-platform] 数据库 ${config.dbPath}`);
  console.log(`[atw-platform] 任务清单 ${config.tasksManifestPath}`);
});

function shutdown(signal) {
  console.log(`[atw-platform] 收到 ${signal}，正在退出`);
  taskSync.stop();
  clearInterval(sessionCleanup);
  server.close(() => {
    database.close();
    process.exit(0);
  });
  // 兜底：10 秒内没关干净就硬退，别让 systemd 一直等
  setTimeout(() => process.exit(0), 10_000).unref?.();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
