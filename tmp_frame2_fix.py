import sys

with open("docs/figma-review/kaitianclaw-design-board.html", "r", encoding="utf-8") as f:
    html = f.read()

f2_start = html.find("<!-- ===== Frame 2: 主工作台 / 活跃对话 + Agent 侧栏展开 ===== -->")
f3_start = html.find("<!-- ===== Frame 3: 团队总览")

frame2_html = html[f2_start:f3_start]

# 1. Update Settings Icon
old_sbf = """<div class="sbf">
          <div class="uav"></div><span class="un" style="font-size:13px;font-weight:500">Administrator</span>
        </div>"""
new_sbf = """<div class="sbf">
          <div class="uav"></div><span class="un" style="font-size:13px;font-weight:500;flex:1">Administrator</span><span class="ib" style="font-size:16px;width:28px;height:28px" title="设置">⚙</span>
        </div>"""
frame2_html = frame2_html.replace(old_sbf, new_sbf)

# 2. Update Composer
old_cc = """<div class="cc">
          <div class="cw">
            <div class="cb"><button class="cb-btn cb-at">📎</button><textarea class="ci" placeholder="给 KTClaw 发送消息..."
                rows="1"></textarea><button class="cb-btn cb-s" style="background:#10b981; color:#fff; cursor:pointer;">➤</button></div>
          </div>
        </div>"""
new_cc = """<div class="cc">
          <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
            <div class="cw" style="max-width:920px; border-radius:32px; padding:12px 16px 12px 24px; display:flex; align-items:center; gap:16px; border:1px solid #f1f5f9; background:#fbabfa05; box-shadow:0 8px 24px rgba(0,0,0,0.04); margin-bottom:12px;">
              <button class="cb-btn cb-at" style="width:28px; height:28px; background:transparent; font-size:18px; color:#64748b; padding:0;">📎</button>
              <textarea class="ci" placeholder="给 KTClaw 发送消息..." rows="1" style="flex:1; background:transparent; padding:8px 0; border:none; outline:none; font-size:15px;"></textarea>
              <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
                <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:16px;background:#f1f5f9;font-size:13px;color:#64748b;cursor:pointer;font-weight:500;">
                  <span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>GLM-5 ▾
                </span>
                <button class="cb-btn cb-s" style="width:40px;height:40px;border-radius:50%;background:#10b981;color:#fff;font-size:18px;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3);">➤</button>
              </div>
            </div>
            <div class="cf" style="font-size: 13px; color: #94a3b8; margin-top: 0; margin-bottom: 8px;">Agent 在本地安全运行 · 由 AI 模型生成内容</div>
          </div>
        </div>"""
if old_cc in frame2_html:
    frame2_html = frame2_html.replace(old_cc, new_cc)
else:
    print("WARNING: Could not find old_cc exact string match.")

# 3. Update Custom Agent Profile sidebar
import re
new_rd = """<aside class="rd" style="width:360px; border-left:1px solid #e2e8f0; background:#fdfdfd; display:flex; flex-direction:column;">
        <div class="rdh" style="padding:16px 24px; border-bottom:none; display:flex; justify-content:space-between; align-items:center;">
          <div style="width:24px;height:24px;"></div> <!-- Spacer -->
          <div class="ib" style="width:32px;height:32px;border-radius:50%;background:#f1f5f9;font-size:12px;">✕</div>
        </div>
        
        <div class="rdb" style="flex:1; padding:0 24px 24px; overflow-y:auto; display:flex; flex-direction:column; gap:36px;">
          <!-- Header Profile -->
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:68px; height:68px; border-radius:50%; background:linear-gradient(135deg, #c084fc, #f43f5e); color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; box-shadow:0 4px 12px rgba(244,63,94,0.15);">沉思</div>
            <div>
              <h3 style="font-size:22px; font-weight:600; color:#0f172a; margin-bottom:4px;">小钱</h3>
              <p style="font-size:15px; color:#64748b;">AI coworker</p>
            </div>
          </div>
          
          <!-- Block 1: 关于我 -->
          <div>
            <h4 style="font-size:15px; font-weight:600; color:#334155; margin-bottom:12px;">关于我</h4>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:64px; color:#64748b; font-size:15px;">生日</div>
                <div style="flex:1; color:#334155; font-size:15px;">—</div>
              </div>
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:64px; color:#64748b; font-size:15px;">风格</div>
                <div style="flex:1; color:#334155; font-size:15px; display:flex; flex-direction:column; gap:10px;">
                  <span>sharp</span>
                  <span>resourceful</span>
                  <span>no-nonsense</span>
                </div>
              </div>
              <div style="display:flex; padding:16px 20px;">
                <div style="width:64px; color:#64748b; font-size:15px;">emoji</div>
                <div style="flex:1; font-size:18px;">🦞</div>
              </div>
            </div>
          </div>
          
          <!-- Block 2: 我眼中的你 -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
              <h4 style="font-size:15px; font-weight:600; color:#334155;">我眼中的你</h4>
              <span style="font-size:12px; color:#94a3b8;">我知道得越多，帮得越好</span>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">名字</div>
                <div style="flex:1; color:#334155; font-size:15px;">6</div>
              </div>
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">称呼</div>
                <div style="flex:1; color:#334155; font-size:15px;">6</div>
              </div>
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">时区</div>
                <div style="flex:1; color:#334155; font-size:15px;">Asia/Shanghai</div>
              </div>
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">专注于</div>
                <div style="flex:1; color:#334155; font-size:15px;">coding</div>
              </div>
              <div style="display:flex; padding:16px 20px;">
                <div style="width:70px; color:#64748b; font-size:15px;">备注</div>
                <div style="flex:1; color:#334155; font-size:15px; display:flex; flex-direction:column; gap:10px;">
                  <span>Name: 6</span>
                  <span>Timezone: Asia/Shanghai</span>
                  <span>Language: 中文</span>
                  <span>首次上线: 2026-03-16</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Block 3: 我的笔记 -->
          <div>
            <h4 style="font-size:15px; font-weight:600; color:#334155; margin-bottom:12px;">我的笔记</h4>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">当前项目</div>
                <div style="flex:1; color:#334155; font-size:15px;">Current project not recorded yet</div>
              </div>
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">工作流</div>
                <div style="flex:1; color:#334155; font-size:15px;">Capture recurring workflows here</div>
              </div>
              <div style="display:flex; padding:16px 20px; border-bottom:1px solid #f8fafc;">
                <div style="width:70px; color:#64748b; font-size:15px;">记忆系统</div>
                <div style="flex:1; color:#334155; font-size:15px;">Summarize stable facts and working patterns</div>
              </div>
              <div style="display:flex; padding:16px 20px;">
                <div style="width:70px; color:#64748b; font-size:15px;">工具链</div>
                <div style="flex:1; color:#334155; font-size:15px; line-height:1.5;">Record important tools, services, and local setup here</div>
              </div>
            </div>
          </div>

          <!-- Block 4: 重要教训 -->
          <div style="margin-bottom:24px;">
            <h4 style="font-size:15px; font-weight:600; color:#334155; margin-bottom:12px;">重要教训</h4>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px;">
              <ol style="margin:0; padding-left:16px; color:#334155; font-size:15px; line-height:1.6; display:flex; flex-direction:column; gap:12px;">
                <li>Confirm before making risky changes</li>
                <li>Persist important facts so they survive the session</li>
              </ol>
            </div>
          </div>

        </div>
      </aside>"""

# Using explicit search to avoid .*? greediness problems over newlines if any
match = re.search(r'<aside class="rd">[\s\S]+?</aside>', frame2_html)
if match:
    frame2_html = frame2_html[:match.start()] + new_rd + frame2_html[match.end():]
else:
    print("WARNING: Could not find <aside class='rd'>")

print("Checking div counts for safety...")
div_in = frame2_html.count("<div")
div_out = frame2_html.count("</div")
print(f"divs opening: {div_in}, divs closing: {div_out}")
if div_in != div_out:
    print("FATAL ERROR: unbalanced Divs! Fix the script.")
    sys.exit(1)

html = html[:f2_start] + frame2_html + html[f3_start:]

with open("docs/figma-review/kaitianclaw-design-board.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Safely replaced Frame 2 elements!")
