import re

with open('docs/figma-review/kaitianclaw-design-board.html', 'r', encoding='utf-8') as f:
    html = f.read()

# We need to replace the content of Frame 09.1
# The frame starts with <!-- ===== Frame 09.1: 能力 / 记忆与知识 ===== -->
# and ends right before <!-- ===== Frame 09.2: 能力 / Skills 与 MCP ===== -->

start_marker = r'<!-- ===== Frame 09.1: 能力 / 记忆与知识 ===== -->'
end_marker = r'<!-- ===== Frame 09.2: 能力 / Skills 与 MCP ===== -->'

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
                <input type="text" placeholder="Search files..." style="width:100%; border:1px solid #e2e8f0; border-radius:6px; padding:6px 12px; font-size:13px; outline:none; background:#f8fafc;">
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
                    <span style="color:#0ea5e9;">📄</span>
                    <span class="db-fi-title">Team Intel</span>
                    <span class="bdg-eg">Evergreen</span>
                  </div>
                  <div class="db-fi-meta">2.2KB · 3h ago</div>
                </div>

                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📄</span>
                    <span class="db-fi-title">Team Memory</span>
                    <span class="bdg-eg">Evergreen</span>
                  </div>
                  <div class="db-fi-meta">2.6KB · 3h ago</div>
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
                    <span style="color:#0ea5e9;">📄</span>
                    <span class="db-fi-title">Daily Log (2026-03-04)</span>
                    <span class="bdg-dy">Daily</span>
                  </div>
                  <div class="db-fi-meta">3.2KB · 2d ago</div>
                </div>

                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📄</span>
                    <span class="db-fi-title">Daily Log (2026-03-03)</span>
                    <span class="bdg-dy">Daily</span>
                  </div>
                  <div class="db-fi-meta">4.0KB · 2d ago</div>
                </div>
                
                <div class="db-fi">
                  <div class="db-fi-t">
                    <span style="color:#0ea5e9;">📄</span>
                    <span class="db-fi-title">Daily Log (2026-03-01)</span>
                    <span class="bdg-dy">Daily</span>
                  </div>
                  <div class="db-fi-meta">8.5KB · 4d ago</div>
                </div>

              </div>
            </div>

            <!-- Right Pane: Code Viewer -->
            <div style="flex:1; display:flex; flex-direction:column; background:#F7F8FA;">
              
              <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px; border-bottom:1px solid #e1e4e8;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:var(--system-blue); font-weight:600; cursor:pointer;">&lt; Files</span>
                    <span style="color:var(--tx3);">memory /</span>
                    <span style="font-weight:600; color:var(--tx1);">team-intel.json</span>
                    <span class="bdg-eg">Evergreen</span>
                  </div>
                  <div style="font-size:11px; color:var(--tx3); margin-top:4px;">90 lines · 2.2KB · 3h ago</div>
                </div>
                <div style="display:flex; gap:12px;">
                  <button style="border:none; background:transparent; display:flex; align-items:center; gap:4px; font-size:13px; color:var(--tx2); cursor:pointer;"><span style="font-size:16px;">⎘</span> Copy</button>
                  <button style="border:none; background:transparent; display:flex; align-items:center; gap:4px; font-size:13px; color:var(--tx2); cursor:pointer;"><span style="font-size:16px;">⬇</span> Download</button>
                </div>
              </div>

              <!-- Code Editor Area -->
              <div style="padding:24px; flex:1; overflow-y:auto;">
                <div style="background:#1E1E1E; border-radius:12px; padding:20px 0; font-family:'Fira Code', 'Courier New', monospace; font-size:13px; line-height:1.6; display:flex; overflow-x:auto;">
                  
                  <!-- Line numbers -->
                  <div style="color:#858585; padding:0 20px; text-align:right; border-right:1px solid #404040; user-select:none;">
                    1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>10<br>11<br>12<br>13<br>14<br>15<br>16<br>17<br>18<br>19<br>20<br>21<br>22<br>23<br>24<br>25<br>26
                  </div>
                  
                  <!-- Code Content (Syntax Highlighted) -->
                  <div style="padding:0 20px; color:#d4d4d4; white-space:pre;">
{
  <span style="color:#ce9178;">"_comment"</span>: <span style="color:#6A9955;">"Structured cross-agent intelligence. Read by any agent for context."</span>,
  <span style="color:#ce9178;">"lastUpdated"</span>: <span style="color:#ce9178;">"2026-03-18T05:31:21.285Z"</span>,
  <span style="color:#ce9178;">"robin"</span>: {
    <span style="color:#ce9178;">"lastRun"</span>: <span style="color:#569cd6;">null</span>,
    <span style="color:#ce9178;">"findings"</span>: [],
    <span style="color:#ce9178;">"hotLeads"</span>: [],
    <span style="color:#ce9178;">"competitorMoves"</span>: []
  },
  <span style="color:#ce9178;">"pulse"</span>: {
    <span style="color:#ce9178;">"lastRun"</span>: <span style="color:#569cd6;">null</span>,
    <span style="color:#ce9178;">"hotSignals"</span>: [],
    <span style="color:#ce9178;">"trendingTopics"</span>: [],
    <span style="color:#ce9178;">"launchesWatched"</span>: []
  },
  <span style="color:#ce9178;">"lumen"</span>: {
    <span style="color:#ce9178;">"lastRun"</span>: <span style="color:#569cd6;">null</span>,
    <span style="color:#ce9178;">"recentPosts"</span>: [],
    <span style="color:#ce9178;">"topPerforming"</span>: [],
    <span style="color:#ce9178;">"pendingDrafts"</span>: []
  },
  <span style="color:#ce9178;">"spark"</span>: {
    <span style="color:#ce9178;">"lastRun"</span>: <span style="color:#569cd6;">null</span>,
    ...
}</div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  </div>

<!-- ===== Frame 09.1-2: 能力 / 记忆与知识 (Tab 1: 策略配置兜底) ===== -->
  <div class="fw">
    <h1 class="ft">09.1-b 设置中心 / 能力 <span>Memory 策略配置</span></h1>
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
        <main class="scn" style="background: #F7F8FA;">
          <div class="sch" style="padding-bottom: 0; margin-bottom: 24px;">
            <h1>Memory 记忆与知识库</h1>
            
            <!-- Segmented Control / Tabs -->
            <div style="display:flex; gap:24px; margin-top:16px; border-bottom:1px solid #e1e4e8; padding-bottom:0;">
              <div style="font-weight:600; color:var(--system-blue); padding-bottom:12px; border-bottom:2px solid var(--system-blue); cursor:pointer;">策略配置 (Settings)</div>
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(2)">数据浏览器 (Browser)</div>
            </div>
          </div>
          <div class="ss" style="max-width:960px;">

          <div class="skc" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
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
          <div class="skc" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
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
          <div class="skc" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
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
        
          </div>
        </main>
      </div>
    </div>
  </div>
'''

with open('docs/figma-review/kaitianclaw-design-board.html', 'w', encoding='utf-8') as f:
    f.write(before + new_content + "\n" + after)

print("Successfully injected Frame 09.1 dual pane layout")
