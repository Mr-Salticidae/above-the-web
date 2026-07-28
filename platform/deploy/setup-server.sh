#!/usr/bin/env bash
# 香港服务器首次安装脚本 —— 只需跑一次。之后更新走 CI（deploy-platform.yml）。
#
# 用法：
#   scp -r platform root@43.128.2.172:/tmp/atw-platform
#   ssh root@43.128.2.172 'bash /tmp/atw-platform/deploy/setup-server.sh'

set -euo pipefail

APP_DIR=/opt/atw-platform
DATA_DIR=/var/lib/atw-platform
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> 检查 Node 版本（需要 >= 22.5，node:sqlite 才可用）"
if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 node。先装 Node 22+：" >&2
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs" >&2
  exit 1
fi
node -e 'const [maj,min]=process.versions.node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 5)) { console.error("Node 版本过低：" + process.version); process.exit(1); }
console.log("Node " + process.version + " OK");'

echo "==> 创建服务账号与目录"
id -u atwplat >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin atwplat
mkdir -p "$APP_DIR" "$DATA_DIR"

echo "==> 复制代码"
# 复制目录内容而不是目录本身：装过一次之后 $APP_DIR/server 已存在，
# `cp -a src/server dst/` 会变成 dst/server/server，重跑就套娃了。
mkdir -p "$APP_DIR/server"
cp -a "$SRC_DIR/server/." "$APP_DIR/server/"

echo "==> 准备 .env"
if [ ! -f "$APP_DIR/server/.env" ]; then
  cp "$SRC_DIR/server/.env.example" "$APP_DIR/server/.env"
  ADMIN_PW=$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | head -c 24)
  sed -i "s|^ATW_ADMIN_PASSWORD=.*|ATW_ADMIN_PASSWORD=${ADMIN_PW}|" "$APP_DIR/server/.env"
  sed -i "s|^ATW_DB_PATH=.*|ATW_DB_PATH=${DATA_DIR}/atw.sqlite|" "$APP_DIR/server/.env"
  # 初始口令写进只有 root 能读的文件，而不是打在 stdout —— 这个脚本也会被 CI 调用，
  # 打出来就等于永久留在 GitHub Actions 的日志里。
  CREDS=/root/atw-platform-first-run.txt
  {
    echo "蛛网之上 · 账号服务初始凭据（生成于 $(date -Is)）"
    echo "登录地址： https://tiaozhuxiansheng.com/account/"
    echo "管理员账号：admin"
    echo "管理员邮箱：$(grep '^ATW_ADMIN_EMAIL=' "$APP_DIR/server/.env" | cut -d= -f2-)"
    echo "管理员密码：${ADMIN_PW}"
    echo
    echo "登录后立刻在个人中心改密码，改完可以删掉这个文件。"
  } > "$CREDS"
  chmod 600 "$CREDS"
  echo "  ★ 初始管理员口令已写入 ${CREDS}（只有 root 能读）"
  echo "    看一眼：ssh root@43.128.2.172 'cat ${CREDS}'"
else
  echo "  已存在 .env，保留不动"
fi

chown -R atwplat:atwplat "$APP_DIR" "$DATA_DIR"
chmod 600 "$APP_DIR/server/.env"

echo "==> 安装 systemd 服务"
cp "$SRC_DIR/deploy/atw-platform.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now atw-platform
sleep 1
systemctl --no-pager --lines=10 status atw-platform || true

echo
echo "==> 还差最后一步：把 deploy/nginx-atw-platform.conf 的内容加进"
echo "    tiaozhuxiansheng.com 的 server 块，然后 nginx -t && systemctl reload nginx"
echo "    注意里面 /api/maieutic 那条精确匹配必须保留，否则 Maieutic 会 404。"
echo "    完成后验证：curl -s https://tiaozhuxiansheng.com/api/meta"
