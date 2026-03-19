import re

with open('docs/figma-review/kaitianclaw-design-board.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove anything from Frame 7 to the end, to replace with our generator loop.
# Frame 7 starts at <!-- ===== Frame 7: 设置中心 / 基础 ===== -->

match = re.search(r'<!-- ===== Frame 7: 设置中心 / 基础 ===== -->', html)
if match:
    base_html = html[:match.start()]
else:
    print("Could not find Frame 7 marker!")
    exit(1)

# Definition of the nav sidebar
def get_sidebar(active_cat, active_item):
    cats = {
        '基础': ['常规设置', '模型与 Provider', '网络与代理'],
        '工作流': ['团队与角色策略', '通道高级配置', '自动化默认策略'],
        '能力': ['记忆与知识', 'Skills 与 MCP', '工具权限'],
        '治理': ['监控与统计', '安全与审批', '迁移与备份', '反馈与开发者']
    }
    nav_html = '<nav class=\"sn\">\n'
    for c, items in cats.items():
        nav_html += f'<div class=\"sng\"><div class=\"snt\">{c}</div>\n'
        for i in items:
            on_class = ' on' if c == active_cat and i == active_item else ''
            nav_html += f'<div class=\"sni{on_class}\">{i}</div>\n'
        nav_html += '</div>\n'
    nav_html += '</nav>'
    return nav_html

# We will define the 13 frames data here
frames = [
    # 基础
    {
        'num': '07.1',
        'cat': '基础',
        'item': '常规设置',
        'title': '常规设置 <span>外观与体验、应用行为</span>',
        'desc': '管理全局外观、语言以及应用启动行为。',
        'content': '''
          <div class="skc">
            <h3>外观与体验</h3>
            <div class="fg"><label class="fl">界面语言</label><select class="fi">
                <option>简体中文</option>
                <option>English</option>
              </select>
              <div class="fd">切换后需重启应用。</div>
            </div>
            <div class="fg"><label class="fl">界面主题</label><select class="fi">
                <option>跟随系统 (System Default)</option>
                <option>浅色 (Light)</option>
                <option>深色 (Dark)</option>
              </select></div>
            <div class="tr">
              <div class="tri"><b>仅以 Emoji 作为头像</b><span>关闭彩色背景，仅显示 Emoji 和玻璃质感</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>隐藏侧栏头像块背景</b><span>使用全透明样式悬浮展示个人 Logo</span></div>
              <div class="ts off"></div>
            </div>
          </div>
          <div class="skc">
            <h3>品牌与身份</h3>
            <div class="fg"><label class="fl">工作台名称</label><input type="text" class="fi" value="KTClaw Control"></div>
            <div class="fg"><label class="fl">副标题</label><input type="text" class="fi" value="智能编排中枢"></div>
            <div class="fg"><label class="fl">我的名字指代</label><input type="text" class="fi" value="Commander"></div>
          </div>
          <div class="skc">
            <h3>应用行为</h3>
            <div class="tr">
              <div class="tri"><b>开机随系统启动</b><span>登录 OS 后自动静默启动 KTClaw 守护进程</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>关闭时隐藏到托盘</b><span>点击顶部关闭按钮时不退出进程，维持 Cron 和通道在线</span></div>
              <div class="ts"></div>
            </div>
          </div>
        '''
    },
    {
        'num': '07.2',
        'cat': '基础',
        'item': '模型与 Provider',
        'title': '模型与服务商 <span>API Key 配置、大语言模型选择</span>',
        'desc': '配置核心推理引擎，绑定第三方 API Key，并指定全局兜底模型。',
        'content': '''
          <div class="skc">
            <h3>默认路由与偏好</h3>
            <div class="fg"><label class="fl">全局默认模型</label><select class="fi">
                <option>gpt-4o (OpenAI)</option>
                <option>claude-3-5-sonnet-20241022 (Anthropic)</option>
                <option>gemini-2.5-pro (Google)</option>
                <option>deepseek-reasoner (DeepSeek)</option>
              </select>
            </div>
            <div class="fg"><label class="fl">对话上下文压缩阈值</label><input type="range" style="width:100%" min="8000" max="64000" value="32000"><div class="fd" style="text-align:right">32,000 Tokens</div></div>
          </div>
          <div class="skc">
            <h3>服务商配置 (Providers)</h3>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#10b981;margin-right:6px"></span>OpenAI</b>
                <span style="font-family:monospace;margin-top:4px">sk-proj-****Fq29</span>
              </div>
              <div style="display:flex;gap:8px"><button class="bo" style="font-size:12px;padding:4px 8px">测速</button><button class="bo" style="font-size:12px;padding:4px 8px">编辑</button></div>
            </div>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#10b981;margin-right:6px"></span>Google Gemini</b>
                <span style="font-family:monospace;margin-top:4px">AIzaSyB****L8U</span>
              </div>
              <div style="display:flex;gap:8px"><button class="bo" style="font-size:12px;padding:4px 8px">测速</button><button class="bo" style="font-size:12px;padding:4px 8px">编辑</button></div>
            </div>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#e2e8f0;margin-right:6px"></span>Anthropic</b>
                <span style="color:var(--tx3);margin-top:4px">未配置 API Key</span>
              </div>
              <div style="display:flex;gap:8px"><button class="bo on" style="font-size:12px;padding:4px 8px">+ 添加</button></div>
            </div>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#e2e8f0;margin-right:6px"></span>Ollama (Local LM)</b>
                <span style="color:var(--tx3);margin-top:4px">未启动本地服务 (127.0.0.1:11434)</span>
              </div>
              <div style="display:flex;gap:8px"><button class="bo" style="font-size:12px;padding:4px 8px">设置</button></div>
            </div>
          </div>
        '''
    },
    {
        'num': '07.3',
        'cat': '基础',
        'item': '网络与代理',
        'title': '网络与代理 <span>通信加速与局域网策略</span>',
        'desc': '所有通过 KTClaw 发起的网络请求的代理路由规则。',
        'content': '''
          <div class="skc">
            <h3>代理设置 (Proxy)</h3>
            <div class="fg"><label class="fl">代理模式</label><select class="fi">
                <option>跟随系统代理 (跟随 Windows 网络设置)</option>
                <option>直连 (Direct)</option>
                <option>自定义 HTTP 代理</option>
                <option>自定义 SOCKS5 代理</option>
              </select>
            </div>
            <div class="fg"><label class="fl">代理服务器地址</label><input type="text" class="fi" value="127.0.0.1"></div>
            <div class="fg"><label class="fl">代理服务端口</label><input type="text" class="fi" value="7890"></div>
          </div>
          <div class="skc">
            <h3>证书与安全</h3>
            <div class="tr">
              <div class="tri"><b>忽略 SSL 证书错误</b><span>(非安全环境调试时开启，比如使用了抓包软件拦截)</span></div>
              <div class="ts off"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>系统根证书</b><span>信任操作系统预装和手动导入的根 CA</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>超时策略</h3>
            <div class="fg"><label class="fl">请求超时 (秒)</label><input type="text" class="fi" value="60"></div>
            <div class="fg"><label class="fl">长轮询心跳间隔 (秒)</label><input type="text" class="fi" value="25"></div>
          </div>
        '''
    },
    # 工作流
    {
        'num': '08.1',
        'cat': '工作流',
        'item': '团队与角色策略',
        'title': '团队架构 <span>角色分配、上下文共享边界</span>',
        'desc': '管理如何自动派生系统子 AI，并给不同种类任务指定默认角色处理。',
        'content': '''
          <div class="skc">
            <h3>组织运行模板</h3>
            <div class="fg"><label class="fl">当前默认架构方案</label><select class="fi">
                <option>三省六部制 (主脑调度，专业分身执行)</option>
                <option>平行专家组 (无明确上下级，靠协同投票)</option>
                <option>单体制 (全交由一个主 AI 完成)</option>
              </select>
              <div class="fd">在“团队 Map”面板中直观可视化当前激活的子智能体。</div>
            </div>
          </div>
          <div class="skc">
            <h3>派生规则</h3>
            <div class="tr">
              <div class="tri"><b>允许运行时自动生成新角色</b><span>主脑判断人手不够时，无需弹窗确认即可启动全新人设的分身。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>默认模型继承</b><span>所有派生出的子 Agent 默认沿用主脑的 Providers 配置，禁止单独越权发起私有计费模型调用。</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>隔离与共享</h3>
            <div class="tr">
              <div class="tri"><b>严格显式传参 (隔离态)</b><span>子 Agent 看不到主对话，只能看到派发给它的任务参数，保证 Token 高效且防串线。</span></div>
              <div class="ts"></div>
            </div>
          </div>
        '''
    },
    {
        'num': '08.2',
        'cat': '工作流',
        'item': '通道高级配置',
        'title': '通道高级配置 <span>IM 集成、静默规则、消息路由</span>',
        'desc': '管理飞书、企业微信、Telegram 等多宿主环境的收发言策略。',
        'content': '''
          <div class="skc">
            <h3>群聊发言默认策略</h3>
            <div class="fg"><label class="fl">默认群聊行为模式</label><select class="fi">
                <option>@触发 (仅被 @ 时回复)</option>
                <option>静默学习 (仅读取，不抢答，生成分析报告)</option>
                <option>审批后发送 (生成在控制台，确认后才发向 IM)</option>
                <option>全域自动 (看懂了就会抢答插话)</option>
              </select>
            </div>
          </div>
          <div class="skc">
            <h3>路由分发矩阵</h3>
            <div class="tr" style="align-items:center;background:var(--bg3);border-radius:var(--r);padding:8px">
              <div style="flex:1"><b>飞书全渠道</b></div>
              <span style="font-size:20px;color:var(--tx3)">→</span>
              <div style="flex:1;text-align:right">分配给 <span class="sb-badge sg-g" style="padding:2px 6px">✦ KTClaw 主脑</span></div>
            </div>
            <div class="tr" style="align-items:center;background:var(--bg3);border-radius:var(--r);padding:8px;margin-top:8px">
              <div style="flex:1"><b>Discord (Support 群组)</b></div>
              <span style="font-size:20px;color:var(--tx3)">→</span>
              <div style="flex:1;text-align:right">分配给 <span class="sb-badge sg-b" style="padding:2px 6px">🤖 小运营跟进</span></div>
            </div>
            <button class="bo" style="width:100%;margin-top:12px">+ 添加路由规则</button>
          </div>
          <div class="skc">
            <h3>风控防骚扰</h3>
            <div class="fg"><label class="fl">群聊每分钟发言上限</label><input type="text" class="fi" value="5">
              <div class="fd">超出后进入 5 分钟的静默冷却。</div>
            </div>
          </div>
        '''
    },
    {
        'num': '08.3',
        'cat': '工作流',
        'item': '自动化默认策略',
        'title': '自动化默认策略 <span>定时调度限制、错误重试与告警</span>',
        'desc': '定义 Cron 等无人值守工作流的并发资源池和异常熔断逻辑。',
        'content': '''
          <div class="skc">
            <h3>调度参数限制</h3>
            <div class="fg"><label class="fl">并行 Worker 槽位</label><select class="fi">
                <option>2 并发 (保守，防 API 封号)</option>
                <option selected>4 并发 (均衡)</option>
                <option>8 并发 (高吞吐)</option>
              </select>
            </div>
            <div class="fg"><label class="fl">单日最大自动化运行次数</label><input type="text" class="fi" value="200">
              <div class="fd">防止死循环剧烈消耗配额。</div>
            </div>
          </div>
          <div class="skc">
            <h3>失败处理与重试</h3>
            <div class="tr">
              <div class="tri"><b>断网或超时后指数退避重试 (Exponential Backoff)</b><span>采用 1min / 5min / 15min / 1hour 进行 4 次尝试</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>工具报错让 Agent 原地思辨</b><span>当 API 报 400 时，给 Agent 至多 3 轮机会尝试修复参数</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>告警触发器</h3>
            <div class="tr">
              <div class="tri"><b>连续失败将任务挂起并标红 (Suspend)</b><span>不轻易跳过，等待人类处理</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>主系统发呆、熔断推送到手机通道</b><span>通过通知组件强制唤醒人类监督审核</span></div>
              <div class="ts"></div>
            </div>
          </div>
        '''
    },
    # 能力
    {
        'num': '09.1',
        'cat': '能力',
        'item': '记忆与知识',
        'title': '记忆与知识 <span>长记忆库、向量嵌入、知识图谱</span>',
        'desc': '管理 Agent 过往对话记忆如何被索引和回溯。',
        'content': '''
          <div class="skc">
            <h3>全局长期记忆策略</h3>
            <div class="fg"><label class="fl">存储底层</label><select class="fi">
                <option>Local SQLite + BM25 全文检索 (默认最轻量)</option>
                <option>ChromaDB (本地向量库引擎)</option>
                <option>Pinecone (云端商业引擎)</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Embeddings 大小与模型</label><select class="fi">
                <option>text-embedding-3-small (OpenAI, 高性价比)</option>
                <option>BGE-m3 (本地极客)</option>
              </select>
            </div>
          </div>
          <div class="skc">
            <h3>自动浓缩与总结</h3>
            <div class="tr">
              <div class="tri"><b>多轮对话自动滚动压缩 (Context Consolidation)</b><span>当活跃上下文 > 16k tokens 后，提取核心知识覆盖至长记并修剪前端。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>每日复盘生成 (Nightly Reflection)</b><span>利用凌晨系统极低负载时，把昨天的 IM 互动合并梳理到全局画像中。</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>挂载本地目录知识</h3>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b>D:/CompanyDocs/Handbook</b>
                <span style="color:var(--tx3)">143 PDFs, 42 MDs</span>
              </div>
              <div style="display:flex;gap:8px"><button class="bo" style="font-size:12px;padding:4px 8px">重做索引</button></div>
            </div>
            <button class="bo" style="width:100%;margin-top:12px">+ 添加本地监控目录集</button>
          </div>
        '''
    },
    {
        'num': '09.2',
        'cat': '能力',
        'item': 'Skills 与 MCP',
        'title': 'Skills 与 MCP 服务 <span>能力组件拔插</span>',
        'desc': '管理内部执行器 (Skills) 和外部协议服务 (mcp-servers)。',
        'content': '''
          <div class="skc">
            <h3>已安装内置技能 (Native Skills)</h3>
            <div class="tr">
              <div class="tri"><b>file_system</b><span style="color:#64748b">本地文件的读写、搜索</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>browser_control (Playwright)</b><span style="color:#64748b">控制无头浏览器抓包、截屏与交互点击</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>terminal_session (Node PTY)</b><span style="color:#64748b">长连接跨平台的控制台执行环境</span></div>
              <div class="ts"></div>
            </div>
            <div style="text-align:center;margin-top:12px"><span style="color:var(--system-blue);font-size:13px;cursor:pointer">浏览技能市场…</span></div>
          </div>
          <div class="skc">
            <h3>Model Context Protocol 接入</h3>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b><span style="background:#000;color:#fff;border-radius:4px;padding:0 4px;font-size:10px;margin-right:6px">GH</span>MCP GitHub Service</b>
                <span style="font-family:monospace;margin-top:4px">npx -y @modelcontextprotocol/server-github</span>
              </div>
              <div><span class="sb-badge sg-g" style="padding:2px 6px">Active</span></div>
            </div>
            <div class="tr" style="align-items:flex-start">
              <div class="tri">
                <b><span style="background:#3b82f6;color:#fff;border-radius:4px;padding:0 4px;font-size:10px;margin-right:6px">S3</span>MCP Amazon S3 Bridge</b>
                <span style="font-family:monospace;margin-top:4px;color:var(--tx3)">stdmcp_amazonS3 --bucket clawx-assets</span>
              </div>
              <div style="display:flex;gap:8px"><button class="bo" style="font-size:12px;padding:4px 8px">唤醒</button><button class="bo" style="font-size:12px;padding:4px 8px">配置</button></div>
            </div>
            <button class="bo" style="width:100%;margin-top:12px">+ 添加新的 MCP JSON RPC 节点</button>
          </div>
        '''
    },
    {
        'num': '09.3',
        'cat': '能力',
        'item': '工具权限',
        'title': '工具权限 <span>能力沙箱与拦截黑名单</span>',
        'desc': '严格规范哪些工具甚至哪个文件夹允许被智能系统修改。',
        'content': '''
          <div class="skc">
            <h3>基础沙箱策略</h3>
            <div class="fg"><label class="fl">全局风险级别设定</label><select class="fi">
                <option>Conservative 保守模式 (全部拒绝有副作用的操作，仅限只读)</option>
                <option selected>Standard 防御模式 (读受控区，写必审批，命令受限)</option>
                <option>Fully Trusted 信任模式 (完全放权大模型)</option>
              </select>
            </div>
          </div>
          <div class="skc">
            <h3>本地文件操作许可 (File I/O ACL)</h3>
            <div class="tr">
              <div class="tri"><b>允许读取文件清单 (只读)</b><span>仅包括 desktop, documents 目录以及指定 repo。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>强制限制写入区域</b><span>除了配置出的沙盒目录 (C:\\KTClaw_Workspace) 之外的一律弹窗或拦截。</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>命令行执行许可 (Terminal ACL)</h3>
            <div class="tr">
              <div class="tri"><b>拦截破坏性命令执行</b><span>通过静态正则表达式嗅探 rm -rf, mkfs, format, sudo 等关键字。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>允许下载网络流</b><span>允许 wget, curl, pip, pnpm 进系统的副作用</span></div>
              <div class="ts"></div>
            </div>
          </div>
        '''
    },
    # 治理
    {
        'num': '10.1',
        'cat': '治理',
        'item': '监控与统计',
        'title': '监控与统计 <span>用量管理与日志留存</span>',
        'desc': '关注 API 经费、硬件消耗与对话生命周期维护。',
        'content': '''
          <div class="skc">
            <h3>用量告警水位 (Quota & Billing Alert)</h3>
            <div class="fg"><label class="fl">日均 Token 警戒阈值</label><input type="text" class="fi" value="200,000">
              <div class="fd">包含输入和输出。超过后将拒绝无权 Cron 触发器。</div>
            </div>
            <div class="fg"><label class="fl">预估经费提醒限制 (基于官方挂牌价)</label><input type="text" class="fi" value=".50 / Day">
            </div>
          </div>
          <div class="skc">
            <h3>数据清洗与下沉</h3>
            <div class="fg"><label class="fl">日志及运行时调试包保留策略</label><select class="fi">
                <option>保留 7 天，其后粉碎</option>
                <option selected>保留 30 天后转离线档</option>
                <option>无限期保留</option>
              </select>
            </div>
            <div class="tr">
              <div class="tri"><b>自动删除孤儿执行物</b><span>清空 7 天前的缓存截图、Browser Session Profile 等。</span></div>
              <div class="ts"></div>
            </div>
          </div>
        '''
    },
    {
        'num': '10.2',
        'cat': '治理',
        'item': '安全与审批',
        'title': '安全与审批 <span>人机互信边界与拦截链</span>',
        'desc': '管理什么时候必须将系统挂起并呼叫 Owner 进行人工审查。',
        'content': '''
          <div class="skc">
            <h3>二次确认机制 (Human in the loop)</h3>
            <div class="tr">
              <div class="tri"><b>全局广播或 @所有人 发言</b><span>在企业微信/飞书发布正式全员消息前必须弹窗索要 Token 许可。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>批量覆盖 / 删除源代码</b><span>对工作目录中 >5 个文件执行 git clean 或强制覆盖前要求人工干预。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>操作云资源</b><span>涉及 MCP 工具中含 AWS/GCP 终止 EC2、注销 IAM 等词频动作。</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>内容审计与合规</h3>
            <div class="tr">
              <div class="tri"><b>开启出向信息审查 (Outbound DLP)</b><span>在向公网 IM 输出字符前阻断含有秘密 API Key/密钥格式的内容外流。</span></div>
              <div class="ts"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>保持完整的无损审计流水账</b><span>把调用链参数记录到 udit_log.db 以作取证使用 (哪怕执行失败也会存底)。</span></div>
              <div class="ts"></div>
            </div>
          </div>
        '''
    },
    {
        'num': '10.3',
        'cat': '治理',
        'item': '迁移与备份',
        'title': '迁移与备份 <span>配置同步、回滚、系统迁移</span>',
        'desc': '防止配置迷失、意外摧毁并支持在主副工作计算机间的转移。',
        'content': '''
          <div class="skc">
            <h3>冷备与导出</h3>
            <div class="tr" style="border:1px solid #e2e8f0;border-radius:var(--r);padding:16px">
              <div style="flex:1">
                <div style="font-weight:600;font-size:14px;color:var(--tx1);margin-bottom:4px">备份完整快照包 (Snapshot)</div>
                <div style="font-size:12px;color:var(--tx3)">将一切 Settings, Credentials (AES256加密), Cron 配置, 知识图谱打进单个 .ktclaw 存档。</div>
              </div>
              <button class="bo" style="font-size:13px;height:36px;padding:0 16px;background:var(--tx1);color:#fff;border:none">导出存档...</button>
            </div>
            <div class="tr" style="border:1px solid #e2e8f0;border-radius:var(--r);padding:16px;margin-top:12px">
              <div style="flex:1">
                <div style="font-weight:600;font-size:14px;color:var(--tx1);margin-bottom:4px">从快照迁移 / 覆盖式导入</div>
                <div style="font-size:12px;color:var(--tx3)">适用于换新电脑，选择文件后需重启本应用。(当前未保存数据将丢失)。</div>
              </div>
              <button class="bo" style="font-size:13px;height:36px;padding:0 16px">选择 .ktclaw 导入</button>
            </div>
          </div>
          <div class="skc">
            <h3>自动增量备份</h3>
            <div class="tr">
              <div class="tri"><b>每日本地保留配置历史 (Git-like)</b><span>这允许当你改错某个复杂 MCP JSON 后无痛一键回滚。 (上限 5 档历史)</span></div>
              <div class="ts"></div>
            </div>
          </div>
          <div class="skc">
            <h3>恢复出厂 (Hard Reset)</h3>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:13px;color:#ef4444">清除所有设置与关联 Agent 数据... (此操作无法撤销)</span>
              <button class="bo" style="border-color:#fecaca;color:#ef4444;background:#fef2f2">清空并重启</button>
            </div>
          </div>
        '''
    },
    {
        'num': '10.4',
        'cat': '治理',
        'item': '反馈与开发者',
        'title': '反馈与开发者 <span>诊断工具、实验室特性</span>',
        'desc': '高级技术专家面板及其支持入口。',
        'content': '''
          <div class="skc">
            <h3>实验室实验 (Experimental Flags)</h3>
            <div class="tr">
              <div class="tri"><b>开发者专用模式 (Dev Mode)</b><span>在主工作台解锁底层 WebSocket 抓包控制台与 RAW Payload 窗口。</span></div>
              <div class="ts off"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>启用远程 API RPC 监听</b><span>开启本地 18789 端口，允许本机的浏览器扩展或其他 Shell 直接使唤主控内核。 (有一定风险)</span></div>
              <div class="ts off"></div>
            </div>
            <div class="tr">
              <div class="tri"><b>启用 Tauri/Web P2P 同步 (预览)</b><span>正在酝酿的能力测试：多机器设备组网互传 Agent 记忆。</span></div>
              <div class="ts off"></div>
            </div>
          </div>
          <div class="skc">
            <h3>诊断排错与反馈系统</h3>
            <div class="tr" style="align-items:center;background:var(--bg3);border-radius:var(--r);padding:12px;margin-bottom:12px">
              <div style="flex:1">
                <b><span style="color:#2563eb">KTClaw Doctor</span></b><br>
                <span style="font-size:12px;color:var(--tx3)">完整分析你的环境变量、Nodejs 版本与目录权限有无隐患。</span>
              </div>
              <button class="bo" style="font-size:12px">Run checks</button>
            </div>
            <div class="tr">
              <div class="tri"><b>崩溃时自动发送匿名报告 (Telemetry)</b><span>帮助核心社区了解运行时发生的 Electron 异常。</span></div>
              <div class="ts off"></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:16px">
              <button class="bo" style="flex:1;border-style:dashed;color:var(--tx3)">📝 提交 Issue (GitHub)</button>
              <button class="bo" style="flex:1;border-style:dashed;color:var(--tx3)">🐛 复制本机运行环境清单</button>
            </div>
          </div>
        '''
    }
]

# Write out the new frames
output_html = base_html

for frm in frames:
    output_html += f"  <!-- ===== Frame {frm['num']}: {frm['cat']} / {frm['item']} ===== -->\n"
    output_html += '  <div class="fw">\n'
    output_html += f'    <h1 class="ft">{frm["num"]} 设置中心 / {frm["cat"]} <span>{frm["item"]}</span></h1>\n'
    output_html += '    <div class="aw">\n'
    output_html += '      <div class="sl">\n'
    output_html += get_sidebar(frm['cat'], frm['item']) + '\n'
    output_html += '        <main class="scn">\n'
    output_html += '          <div class="sch">\n'
    output_html += f'            <h1>{frm["title"]}</h1>\n'
    output_html += f'            <p>{frm["desc"]}</p>\n'
    output_html += '          </div>\n'
    output_html += '          <div class="ss">\n'
    output_html += frm['content'] + '\n'
    output_html += '          </div>\n'
    output_html += '        </main>\n'
    output_html += '      </div>\n'
    output_html += '    </div>\n'
    output_html += '  </div>\n\n'

output_html += '</body>\n</html>'

with open('docs/figma-review/kaitianclaw-design-board.html', 'w', encoding='utf-8') as f:
    f.write(output_html)

print("Successfully injected 13 setting frames!")
