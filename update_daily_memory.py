import re

with open('docs/figma-review/kaitianclaw-design-board.html', 'r', encoding='utf-8') as f:
    html = f.read()

# We need to replace the content of Frame 09.1 Tab 1 (Data Browser)
# The frame starts with <!-- ===== Frame 09.1-1: 能力 / 记忆与知识 (Tab 2: 数据浏览器) ===== --> 
# and ends right before <!-- ===== Frame 09.1-2: 能力 / 记忆与知识 (Tab 1: 策略配置兜底) ===== -->

start_marker = r'<!-- ===== Frame 09.1-1: 能力 / 记忆与知识 \(Tab 2: 数据浏览器\) ===== -->'
end_marker = r'<!-- ===== Frame 09.1-2: 能力 / 记忆与知识 \(Tab 1: 策略配置兜底\) ===== -->'

match_start = re.search(start_marker, html)
match_end = re.search(end_marker, html)

if not match_start or not match_end:
    print("Could not find markers!")
    exit(1)

before = html[:match_start.start()]
after = html[match_end.start():]

new_content = '''<!-- ===== Frame 09.1-1: 能力 / 记忆与知识 (Tab 2: 数据浏览器) ===== -->
  <div class="fw">
    <h1 class="ft">09.1-a 设置中心 / 能力 <span>Memory 数据浏览器</span></h1>
    <div class="aw">
      <div class="sl">
<nav class="sn">
<div class="sng"><div class="snt">基础</div></div>
<div class="sng"><div class="snt">工作流</div></div>
<div class="sng"><div class="snt">能力</div>
<div class="sni on">记忆与知识</div>
<div class="sni">Skills 与 MCP</div>
<div class="sni">工具权限</div>
</div>
<div class="sng"><div class="snt">治理</div></div>
</nav>
        <main class="scn" style="background: #F7F8FA; display:flex; flex-direction:column;">
          <div class="sch" style="padding-bottom: 0; margin-bottom: 0;">
            <h1>Memory 记忆与知识库</h1>
            
            <!-- Segmented Control / Tabs -->
            <div style="display:flex; gap:24px; margin-top:16px; border-bottom:1px solid #e1e4e8; padding-bottom:0;">
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(1)">策略配置 (Settings)</div>
              <div style="font-weight:600; color:var(--system-blue); padding-bottom:12px; border-bottom:2px solid var(--system-blue); cursor:pointer;">数据浏览器 (Browser)</div>
            </div>
          </div>
          
          <!-- VS Code Style Dual Pane -->
          <div style="display:flex; flex:1; height:600px; border-top:1px solid #e1e4e8;">
            
            <!-- Left Pane: File List -->
            <div style="width:280px; border-right:1px solid #e1e4e8; background:#fff; display:flex; flex-direction:column;">
              <div style="padding:12px; border-bottom:1px solid #f1f5f9;">
                <input type="text" placeholder="Search memory..." style="width:100%; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:13px; outline:none; background:#f8fafc;">
                <div style="display:flex; gap:8px; margin-top:8px;">
                  <span style="font-size:11px; padding:2px 6px; border-radius:12px; background:#ef4444; color:#fff; cursor:pointer;">Date</span>
                  <span style="font-size:11px; padding:2px 6px; border-radius:12px; background:#f1f5f9; color:var(--tx2); cursor:pointer;">Name</span>
                  <span style="font-size:11px; padding:2px 6px; border-radius:12px; background:#f1f5f9; color:var(--tx2); cursor:pointer;">Size</span>
                </div>
              </div>
              
              <div style="flex:1; overflow-y:auto; padding:8px;">
                <style>
                  .db-fi { display:flex; flex-direction:column; padding:10px 12px; border-radius:6px; cursor:pointer; margin-bottom:4px; }
                  .db-fi:hover { background:#f8fafc; }
                  .db-fi.on { background:#e0f2fe; border-left:3px solid var(--system-blue); padding-left:9px; }
                  .db-fi-t { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
                  .db-fi-title { font-size:13px; font-weight:600; color:var(--tx1); }
                  .bdg-eg { font-size:10px; padding:2px 6px; background:#dcfce7; color:#166534; border-radius:4px; }
                  .bdg-dy { font-size:10px; padding:2px 6px; background:#e0f2fe; color:#0369a1; border-radius:4px; }
                  .db-fi-meta { font-size:11px; color:var(--tx3); }
                </style>

                <div class="db-fi on">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📝</span>
                    <span class="db-fi-title">Daily Memory</span>
                    <span class="bdg-dy">2026-03-10</span>
                  </div>
                  <div class="db-fi-meta">1.2KB · 2h ago</div>
                </div>

                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📝</span>
                    <span class="db-fi-title">Daily Memory</span>
                    <span class="bdg-dy">2026-03-09</span>
                  </div>
                  <div class="db-fi-meta">3.4KB · 1d ago</div>
                </div>

                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📄</span>
                    <span class="db-fi-title">Long-Term Memory</span>
                    <span class="bdg-eg">Evergreen</span>
                  </div>
                  <div class="db-fi-meta">33.8KB · 2d ago</div>
                </div>

                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">��</span>
                    <span class="db-fi-title">Daily Memory</span>
                    <span class="bdg-dy">2026-03-08</span>
                  </div>
                  <div class="db-fi-meta">2.8KB · 2d ago</div>
                </div>
                
                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📝</span>
                    <span class="db-fi-title">Daily Memory</span>
                    <span class="bdg-dy">2026-03-07</span>
                  </div>
                  <div class="db-fi-meta">4.1KB · 3d ago</div>
                </div>

              </div>
            </div>

            <!-- Right Pane: Markdown Viewer -->
            <div style="flex:1; display:flex; flex-direction:column; background:#F7F8FA;">
              
              <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px; border-bottom:1px solid #e1e4e8;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:var(--system-blue); font-weight:600; cursor:pointer;">&lt; Files</span>
                    <span style="color:var(--tx3);">memory /</span>
                    <span style="font-weight:600; color:var(--tx1);">2026-03-10.md</span>
                    <span class="bdg-dy">Daily</span>
                  </div>
                  <div style="font-size:11px; color:var(--tx3); margin-top:4px;">12 lines · 1.2KB · 2h ago</div>
                </div>
                <div style="display:flex; gap:12px;">
                  <button style="border:none; background:transparent; display:flex; align-items:center; gap:4px; font-size:13px; color:var(--tx2); cursor:pointer;"><span style="font-size:16px;">⎘</span> Copy</button>
                  <button style="border:none; background:transparent; display:flex; align-items:center; gap:4px; font-size:13px; color:var(--tx2); cursor:pointer;"><span style="font-size:16px;">✏️</span> Edit</button>
                </div>
              </div>

              <!-- Markdown Render Area -->
              <div style="padding:24px; flex:1; overflow-y:auto;">
                <div style="background:#fff; border-radius:12px; padding:32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:14px; line-height:1.6; color:#333;">
                  
                  <h1 style="font-size:24px; font-weight:700; margin-bottom:16px; border-bottom:1px solid #e1e4e8; padding-bottom:8px;">每日 Memory 初始化完成 ✌️</h1>
                  
                  <h3 style="font-size:16px; font-weight:600; margin-top:24px; margin-bottom:8px; color:var(--tx1);">日期</h3>
                  <ul style="margin:0; padding-left:20px; color:var(--tx2);">
                    <li style="margin-bottom:4px;">状态: <span style="font-weight:500; color:var(--system-blue);">2026-03-10 (Day 6)</span></li>
                  </ul>

                  <h3 style="font-size:16px; font-weight:600; margin-top:24px; margin-bottom:8px; color:var(--tx1);">文件创建</h3>
                  <ul style="margin:0; padding-left:20px; color:var(--tx2);">
                    <li style="margin-bottom:4px;">状态: <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:13px; color:#475569;">/root/.openclaw/workspace/memory/2026-03-10.md</code> ✅</li>
                  </ul>

                  <h3 style="font-size:16px; font-weight:600; margin-top:24px; margin-bottom:8px; color:var(--tx1);">目标回顾</h3>
                  <ul style="margin:0; padding-left:20px; color:var(--tx2);">
                    <li style="margin-bottom:4px;">状态: 已从 03-09 继承：<span style="font-weight:500; color:#10b981;">继续推进 V8 多源融合日报，完成 Agent Reach / Multi Search Engine 集成，测试</span></li>
                  </ul>

                  <h3 style="font-size:16px; font-weight:600; margin-top:24px; margin-bottom:8px; color:var(--tx1);">昨日文件</h3>
                  <ul style="margin:0; padding-left:20px; color:var(--tx2);">
                    <li style="margin-bottom:4px;">状态: <span style="font-style:italic; color:#64748b;">已读取 2026-03-09.md</span></li>
                  </ul>

                  <div style="margin-top:32px; padding:16px; background:#f8fafc; border-left:4px solid var(--system-blue); color:var(--tx2); border-radius:0 8px 8px 0;">
                    <span style="font-size:18px; margin-right:8px;">🌅</span> 新的一天开始啦！有什么新任务尽管说~
                  </div>

                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
'''

with open('docs/figma-review/kaitianclaw-design-board.html', 'w', encoding='utf-8') as f:
    f.write(before + new_content + "\n" + after)

print("Successfully injected Daily Memory content")
