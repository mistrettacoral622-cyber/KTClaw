# OpenClaw 接入微信最小落地文档

## 1. 文档目标

这份文档只讨论一件事：

在一台新机器上，基于 `OpenClaw + @tencent-weixin/openclaw-weixin`，让用户拿手机扫码后，就可以通过微信和 OpenClaw 对话。

本文档刻意去掉所有 KTClaw 桌面产品、工作台 UI、多频道管理、品牌包装相关内容，只保留 OpenClaw 本身接入微信所必需的部分。

---

## 2. 最终效果

完成后，应具备以下能力：

1. 机器上安装 OpenClaw。
2. 安装微信插件 `@tencent-weixin/openclaw-weixin`。
3. 启用插件。
4. 用户执行登录命令后，终端出现二维码。
5. 用户用手机微信扫码并确认授权。
6. OpenClaw 保存登录态。
7. 启动 OpenClaw Gateway 后，微信消息能够进入 OpenClaw，对话可以正常收发。

如果你的目标只是“扫码后就能聊天”，做到这里就够了，不需要再实现额外 UI。

---

## 3. 当前验证过的版本组合

建议使用以下版本组合：

1. `openclaw@2026.3.22`
2. `@tencent-weixin/openclaw-weixin@2.1.1`
3. `Node.js >= 22`

插件元数据里声明的最小宿主版本是：

```json
"openclaw": {
  "install": {
    "minHostVersion": ">=2026.3.22"
  }
}
```

参考：

- [package.json](/C:/Users/22688/Desktop/ClawX-main/package.json)
- [openclaw-weixin package.json](/C:/Users/22688/Desktop/ClawX-main/node_modules/@tencent-weixin/openclaw-weixin/package.json)

如果版本不满足，插件可能直接拒绝加载。

---

## 4. 核心原理

微信能力不是 OpenClaw 主程序内建的，而是通过插件提供：

1. OpenClaw 负责插件加载、配置、Gateway 和消息路由。
2. `@tencent-weixin/openclaw-weixin` 负责二维码登录、消息轮询、发送消息、媒体下载等微信逻辑。

所以最小接入链路只有四步：

1. 安装 OpenClaw。
2. 安装微信插件。
3. 插件登录。
4. 启动 Gateway 并开始对话。

---

## 5. 新机器最小接入步骤

## 5.1 安装 OpenClaw

先确认机器上已经有 OpenClaw CLI：

```bash
openclaw --version
```

如果命令不存在，先按 OpenClaw 官方方式安装。

要求：

1. `openclaw` 命令可执行。
2. 版本不低于 `2026.3.22`。

---

## 5.2 安装微信插件

最直接的方式：

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

安装完成后，插件通常会被放到 OpenClaw 可发现的位置。

插件信息：

1. npm 包名：`@tencent-weixin/openclaw-weixin`
2. 插件 id：`openclaw-weixin`
3. channel id：`openclaw-weixin`

注意：

1. 真正的插件 id 是 `openclaw-weixin`，不是 `wechat`。
2. 配置和命令里都应使用 `openclaw-weixin`。

---

## 5.3 启用插件

执行：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

如果你想更稳一点，也可以确认 allowlist 已包含它：

```bash
openclaw config set plugins.allow.0 openclaw-weixin
```

更推荐的最终状态是 `openclaw.json` 中至少包含：

```json
{
  "plugins": {
    "entries": {
      "openclaw-weixin": {
        "enabled": true
      }
    }
  }
}
```

如果项目中使用插件 allowlist，建议最终是：

```json
{
  "plugins": {
    "allow": ["openclaw-weixin"],
    "entries": {
      "openclaw-weixin": {
        "enabled": true
      }
    }
  }
}
```

---

## 5.4 执行二维码登录

执行：

```bash
openclaw channels login --channel openclaw-weixin
```

预期行为：

1. 终端打印二维码。
2. 用户用手机微信扫码。
3. 手机确认授权。
4. 插件保存登录态。

如果一切正常，到这里微信账号已经接入成功。

---

## 5.5 重启或启动 Gateway

执行：

```bash
openclaw gateway restart
```

或者如果 Gateway 尚未启动，就启动：

```bash
openclaw gateway
```

目标是让插件开始接收微信消息并接入 OpenClaw 对话链路。

---

## 6. 最小配置样例

如果你要手工检查 `~/.openclaw/openclaw.json`，建议它至少满足以下结构：

```json
{
  "channels": {
    "openclaw-weixin": {
      "enabled": true,
      "defaultAccount": "default",
      "accounts": {
        "default": {
          "enabled": true
        }
      }
    }
  },
  "plugins": {
    "enabled": true,
    "allow": ["openclaw-weixin"],
    "entries": {
      "openclaw-weixin": {
        "enabled": true
      }
    }
  },
  "commands": {
    "restart": true
  }
}
```

说明：

1. `channels.openclaw-weixin` 代表微信渠道已启用。
2. `plugins.entries.openclaw-weixin.enabled = true` 代表插件已启用。
3. `defaultAccount = default` 代表默认微信账号。
4. `commands.restart = true` 对某些重启流程有帮助。

---

## 7. 登录态会保存在哪里

微信插件登录成功后，除了 `openclaw.json` 的渠道配置外，还会在本地保存账号状态。

关键目录通常在：

```text
~/.openclaw/openclaw-weixin/
```

常见文件：

```text
~/.openclaw/openclaw-weixin/accounts.json
~/.openclaw/openclaw-weixin/accounts/<accountId>.json
```

单账号文件中通常会包含类似字段：

```json
{
  "token": "<bot_token>",
  "savedAt": "2026-04-21T00:00:00.000Z",
  "baseUrl": "https://...",
  "userId": "..."
}
```

这些文件的作用是：

1. 保存扫码授权后的 token。
2. 保存与微信后端通信需要的 baseUrl。
3. 保存账号标识。

如果这些文件不存在，通常意味着扫码登录没有真正完成。

---

## 8. 默认账号与多账号

如果只是“一个微信号扫码后开始聊天”，只需要默认账号即可。

默认账号的典型配置是：

```json
{
  "channels": {
    "openclaw-weixin": {
      "defaultAccount": "default",
      "accounts": {
        "default": {
          "enabled": true
        }
      }
    }
  }
}
```

如果以后要接入多个微信号，可以重复执行：

```bash
openclaw channels login --channel openclaw-weixin
```

每次扫码都会生成新的账号状态项。

但如果你当前需求只是“新机器上扫码就能用”，建议先只保留单账号方案。

---

## 9. OpenClaw 内部识别规则

这个部分很关键，避免后续配置写错。

### 9.1 正确的 channel / plugin id

统一使用：

```text
openclaw-weixin
```

不要使用：

```text
wechat
```

在纯 OpenClaw 方案里，不需要 UI 别名层，所以应彻底避免把 `wechat` 当成正式 id。

### 9.2 账号 id

默认账号通常是：

```text
default
```

如果插件返回别的 bot id，可能会做归一化处理后写入本地状态文件。

---

## 10. 插件登录的实际机制

当前微信插件的扫码登录不是“OpenClaw 自己生成二维码”，而是调用微信插件所依赖的后端接口。

从已验证实现看，关键参数和行为是：

1. 登录入口 API base：`https://ilinkai.weixin.qq.com`
2. 获取二维码时使用 `bot_type=3`
3. 二维码状态轮询会经历：
   - `wait`
   - `scaned`
   - `scaned_but_redirect`
   - `confirmed`
   - `expired`

也就是说，插件成功工作的前提不是只有 OpenClaw，还包括插件依赖的微信后端能力可用。

如果扫码流程卡住，问题很可能不在 OpenClaw，而在插件依赖的微信后端接口。

---

## 11. 如果你们自己实现微信后端，需要满足什么

如果你们不是直接复用现有插件后端，而是要自己提供服务端，那么必须实现插件要求的 HTTP JSON API。

根据插件 README，关键接口包括：

1. `getupdates`
2. `sendmessage`
3. `getuploadurl`
4. `getconfig`
5. `sendtyping`

通用请求头包括：

1. `Content-Type: application/json`
2. `AuthorizationType: ilink_bot_token`
3. `Authorization: Bearer <token>`
4. `X-WECHAT-UIN: <随机 uint32 的 base64 编码>`

这意味着：

1. 插件不是一个完全离线、纯本地协议实现。
2. 它依赖一套外部微信 bot backend 协议。

如果你的需求只是“在新机器上把 OpenClaw 连起来”，通常不需要自己改这里。
如果你的需求是“以后完全自托管微信后端”，这一节就必须详细实现。

参考：

- [openclaw-weixin README.zh_CN.md](/C:/Users/22688/Desktop/ClawX-main/node_modules/@tencent-weixin/openclaw-weixin/README.zh_CN.md)

---

## 12. 验证步骤

接入完成后，建议按下面顺序验证。

### 12.1 验证版本

```bash
openclaw --version
```

预期：

1. 版本不低于 `2026.3.22`

### 12.2 验证插件已安装

检查插件目录或插件列表，确认 `openclaw-weixin` 存在。

### 12.3 验证插件已启用

检查 `~/.openclaw/openclaw.json`：

1. `plugins.entries.openclaw-weixin.enabled = true`
2. `plugins.allow` 包含 `openclaw-weixin`（如果项目启用了 allowlist）

### 12.4 验证二维码登录

执行：

```bash
openclaw channels login --channel openclaw-weixin
```

预期：

1. 能看到二维码
2. 扫码后状态变为成功
3. `~/.openclaw/openclaw-weixin/accounts/*.json` 出现新文件

### 12.5 验证 Gateway

执行：

```bash
openclaw gateway
```

预期：

1. Gateway 启动成功
2. 微信插件成功加载
3. 微信消息能进入 OpenClaw 对话链路

### 12.6 验证实际对话

最终验证必须是：

1. 用户从微信发一条消息给接入账号
2. OpenClaw 收到消息
3. OpenClaw 正常回复
4. 用户在微信里看到回复

如果只做到“二维码登录成功”，还不能算真正接入完成。

---

## 13. 常见问题与排查

## 13.1 插件报宿主版本过低

现象：

1. 插件安装成功，但加载时报 `requires OpenClaw >=2026.3.22`

处理：

1. 升级 OpenClaw
2. 或安装插件旧版兼容线

例如：

```bash
openclaw plugins install @tencent-weixin/openclaw-weixin@legacy
```

但如果是新机器新项目，建议直接统一升级到兼容版本，不要走 legacy 线。

---

## 13.2 二维码能出来，但扫码后一直不成功

优先检查：

1. 机器网络是否能访问插件依赖的微信后端
2. 登录状态轮询是否返回 `confirmed`
3. `accounts/*.json` 是否成功写入

如果二维码出来但没有账号文件，通常说明扫码流程没有真正落盘。

---

## 13.3 Gateway 启动了，但微信不收消息

检查：

1. 插件是否已启用
2. 登录 token 是否已保存
3. `channels.openclaw-weixin` 是否存在
4. 微信插件是否真的被 OpenClaw 加载
5. 插件依赖的后端接口是否可达

---

## 13.4 配置里误写成 `wechat`

这是最常见错误之一。

错误示例：

```json
{
  "channels": {
    "wechat": {}
  }
}
```

正确示例：

```json
{
  "channels": {
    "openclaw-weixin": {}
  }
}
```

如果新机器是全新环境，建议从一开始就只使用 `openclaw-weixin`，不要做任何 `wechat` 命名。

---

## 13.5 扫码登录成功，但重启后失效

检查：

1. `~/.openclaw/openclaw-weixin/accounts/*.json` 是否被写入
2. 这些文件是否在重启后还存在
3. 进程是否有权限读写 `~/.openclaw`

如果账号文件没有持久化，插件每次都会像首次登录一样要求重新扫码。

---

## 14. 新机器最短执行清单

只看这部分也能落地。

1. 安装 OpenClaw，确认 `openclaw --version`
2. 确认版本 `>= 2026.3.22`
3. 安装插件：

```bash
openclaw plugins install "@tencent-weixin/openclaw-weixin"
```

4. 启用插件：

```bash
openclaw config set plugins.entries.openclaw-weixin.enabled true
```

5. 扫码登录：

```bash
openclaw channels login --channel openclaw-weixin
```

6. 启动或重启 Gateway：

```bash
openclaw gateway restart
```

7. 从微信发送消息，验证 OpenClaw 能回复

---

## 15. 一句话总结

如果你的目标只是“新机器上扫码后就能用微信和 OpenClaw 对话”，最小闭环就是：

1. 装 OpenClaw
2. 装 `@tencent-weixin/openclaw-weixin`
3. 启用 `openclaw-weixin`
4. 执行 `openclaw channels login --channel openclaw-weixin`
5. 启动 Gateway
6. 实测微信收发消息

剩下所有桌面 UI、工作台、多频道管理、品牌封装，都不是这个目标的必需项。
