# Fork 同步官方 main 与 decade 维护流程

本仓库实况（无需重复配置）：

| 远程 / 分支 | 地址或用途 |
|---|---|
| `origin` | `https://github.com/YGShaogezhu/mobilenoname.git` |
| `upstream` | `https://github.com/libnoname/noname.git`（官方） |
| `main` | 与官方同步，**不提交**十周年 / 手杀 UI 改动 |
| `decade` | 十周年 UI、手杀美化等长期维护分支 |

```text
upstream/main  →  local/origin main  →  decade
```

---

## 每次更新前先检查

工作区需干净，且当前不要有未完成的 merge。

```bash
git status -sb
git fetch upstream
# 网络不稳时可试：
# git -c http.version=HTTP/1.1 fetch upstream
git fetch origin
```

统计分歧：

```bash
# 官方比本地 main 多多少提交（>0 才需要同步）
git rev-list --count main..upstream/main

# 本地 main 是否有偏离官方的独有提交（应为 0）
git rev-list --count upstream/main..main
```

可选：

```bash
git log --oneline main..upstream/main
git diff --stat main...upstream/main
```

**通过标准再合并：**

- 工作区干净
- `upstream/main..main == 0`
- 若 `main..upstream/main == 0`：已与官方对齐，跳过合并

**停手条件：** main 相对官方有独有提交，或工作区有未提交改动——先处理再同步。

---

## 固定同步流程

仅在官方超前时执行。

### 1. 更新 main

```bash
git checkout main
git merge upstream/main
git push origin main
```

### 2. 更新 decade

```bash
git checkout decade
git merge main
git push origin decade
```

有冲突时：

```bash
git status
# 逐个解决冲突文件后：
git add <已解决的文件>
git commit
git push origin decade
```

冲突约定：

- `decadeUI` / 动画资源等 UI 扩展目录：优先保留 decade
- 官方核心逻辑 / API：优先吸收 main，再手工适配 UI
- **不要** `git add .` 盲加

---

## 禁止操作

不要在 `decade` 上直接：

```bash
git pull upstream main
```

不要对 `decade` 频繁：

```bash
git rebase main
```

大量 CSS / JS / UI 改动下，rebase 易产生重复冲突；长期维护用 merge 更稳。

不要把十周年 UI 相关提交推到 `main`。

---

## 推荐分支用法

- `main`：仅同步官方
- `decade`：十周年 UI 主开发
- 新功能从 `decade` 拉 `feature/*`，合回 `decade`，不要直接合进 `main`
