import fs from "node:fs";

// 任务清单同步：Astro 构建期把每份任务书的 frontmatter 导出成 /tasks/index.json，
// 这里定时读一次（同机文件，不走网络），把新任务补进库、把 md 改过的标题/报酬刷新。
// 运行时状态（谁认领了、交付没、打款没）不受同步影响。
export function createTaskSync(config, database, log = console) {
  function runOnce() {
    let raw;
    try {
      raw = fs.readFileSync(config.tasksManifestPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        log.error(`[task-sync] 读取清单失败：${error.message}`);
      } else {
        log.warn(`[task-sync] 清单还不存在：${config.tasksManifestPath}（站点构建后会生成）`);
      }
      return null;
    }

    let entries;
    try {
      const parsed = JSON.parse(raw);
      entries = Array.isArray(parsed) ? parsed : parsed.tasks;
    } catch (error) {
      log.error(`[task-sync] 清单不是合法 JSON：${error.message}`);
      return null;
    }
    if (!Array.isArray(entries)) {
      log.error("[task-sync] 清单格式不对，期望数组或 { tasks: [] }");
      return null;
    }

    const result = database.syncTasks(entries);
    if (result.created || result.delisted) {
      log.log(
        `[task-sync] 新增 ${result.created}、刷新 ${result.updated}、下架 ${result.delisted}`,
      );
    }
    return result;
  }

  let timer = null;
  return {
    runOnce,
    start() {
      runOnce();
      timer = setInterval(runOnce, config.tasksSyncMinutes * 60 * 1000);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
