import re

with open('docs/figma-review/kaitianclaw-design-board.html', 'r', encoding='utf-8') as f:
    html = f.read()

# We need to replace the content of Frame 10.1
# The frame starts with <!-- ===== Frame 10.1: 治理 / 监控与统计 ===== -->
# and ends right before <!-- ===== Frame 10.2: 治理 / 安全与审批 ===== -->

start_marker = r'<!-- ===== Frame 10.1: 治理 / 监控与统计 ===== -->'
end_marker = r'<!-- ===== Frame 10.2: 治理 / 安全与审批 ===== -->'

match_start = re.search(start_marker, html)
match_end = re.search(end_marker, html)

if not match_start or not match_end:
    print("Could not find markers!")
    exit(1)

before = html[:match_start.start()]
after = html[match_end.start():]

new_content = '''<!-- ===== Frame 10.1: 治理 / 监控与统计 ===== -->
  <div class="fw">
    <h1 class="ft">10.1 设置中心 / 治理 <span>监控与统计 (Tab 1: 大盘监控)</span></h1>
    <div class="aw">
      <div class="sl">
<nav class="sn">
<div class="sng"><div class="snt">基础</div>
<div class="sni">常规设置</div>
<div class="sni">模型与 Provider</div>
<div class="sni">网络与代理</div>
</div>
<div class="sng"><div class="snt">工作流</div>
<div class="sni">团队与角色策略</div>
<div class="sni">通道高级配置</div>
<div class="sni">自动化默认策略</div>
</div>
<div class="sng"><div class="snt">能力</div>
<div class="sni">记忆与知识</div>
<div class="sni">Skills 与 MCP</div>
<div class="sni">工具权限</div>
</div>
<div class="sng"><div class="snt">治理</div>
<div class="sni on">监控与统计</div>
<div class="sni">安全与审批</div>
<div class="sni">迁移与备份</div>
<div class="sni">反馈与开发者</div>
</div>
</nav>
        <main class="scn" style="background: #F7F8FA;">
          <div class="sch" style="padding-bottom: 0; margin-bottom: 24px;">
            <h1>监控与统计</h1>
            
            <!-- Segmented Control / Tabs -->
            <div style="display:flex; gap:24px; margin-top:16px; border-bottom:1px solid #e1e4e8; padding-bottom:0;">
              <div style="font-weight:600; color:var(--system-blue); padding-bottom:12px; border-bottom:2px solid var(--system-blue); cursor:pointer;">大盘监控 (Dashboard)</div>
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(2)">用量分析 (Usage Breakdown)</div>
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(3)">告警与策略 (Alerts & Policies)</div>
            </div>
          </div>
          
          <div class="ss" style="max-width:960px;">
          
            <!-- 1. KPI Cards -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-bottom:24px;">
              <div class="skc" style="margin-bottom:0; padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:13px; color:var(--tx3); margin-bottom:8px;">总预估花费</div>
                <div style="font-size:28px; font-weight:700; color:var(--tx1);">.50</div>
                <div style="font-size:12px; color:#ef4444; margin-top:4px; font-weight:500;">↗ 27% (+)</div>
              </div>
              <div class="skc" style="margin-bottom:0; padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:13px; color:var(--tx3); margin-bottom:8px;">本周花费</div>
                <div style="font-size:28px; font-weight:700; color:var(--tx1);">.12</div>
                <div style="font-size:12px; color:var(--tx3); margin-top:4px;">上周 .00</div>
              </div>
              <div class="skc" style="margin-bottom:0; padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:13px; color:var(--tx3); margin-bottom:8px;">缓存节省 (Cache Savings)</div>
                <div style="font-size:28px; font-weight:700; color:#10b981;">.40</div>
                <div style="font-size:12px; color:var(--tx3); margin-top:4px;">Hit Rate: 68%</div>
              </div>
              <div class="skc" style="margin-bottom:0; padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:13px; color:var(--tx3); margin-bottom:8px;">异常情况 (Anomalies)</div>
                <div style="font-size:28px; font-weight:700; color:var(--tx1);">0</div>
                <div style="font-size:12px; color:var(--tx3); margin-top:4px;">全部服务正常运行</div>
              </div>
            </div>

            <!-- 2. Most Expensive Crons -->
            <h3 style="font-size:14px; color:var(--tx2); margin-bottom:12px; font-weight:600;">消耗最高定时任务 (30 Days)</h3>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:24px;">
              <div class="skc" style="margin-bottom:0; padding:16px; border-top:3px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-weight:600; color:var(--tx1); margin-bottom:4px;">x-radar-collect</div>
                <div style="font-size:20px; font-weight:700; color:var(--tx1); margin-bottom:8px;">.20</div>
                <div style="font-size:12px; color:var(--tx3);">60 次执行 · 均价 .75/次</div>
              </div>
              <div class="skc" style="margin-bottom:0; padding:16px; border-top:3px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-weight:600; color:var(--tx1); margin-bottom:4px;">daily-digest-news</div>
                <div style="font-size:20px; font-weight:700; color:var(--tx1); margin-bottom:8px;">.90</div>
                <div style="font-size:12px; color:var(--tx3);">30 次执行 · 均价 .96/次</div>
              </div>
              <div class="skc" style="margin-bottom:0; padding:16px; border-top:3px solid #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-weight:600; color:var(--tx1); margin-bottom:4px;">github-issue-triage</div>
                <div style="font-size:20px; font-weight:700; color:var(--tx1); margin-bottom:8px;">.40</div>
                <div style="font-size:12px; color:var(--tx3);">120 次执行 · 均价 .12/次</div>
              </div>
            </div>

            <!-- 3. Charts Area -->
            <div style="display:flex; gap:20px; margin-bottom:24px;">
              <!-- Left: Bar Chart -->
              <div class="skc" style="flex:2; margin-bottom:0; padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-weight:600; color:var(--tx1); margin-bottom:16px;">每日预估花费 (7 Days)</div>
                <div style="height:180px; display:flex; align-items:flex-end; gap:12px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; position:relative;">
                  
                  <!-- Y-Axis Guides -->
                  <div style="position:absolute; left:0; top:0; right:0; height:1px; background:#f1f5f9; z-index:0;"></div>
                  <div style="position:absolute; left:0; top:40px; right:0; height:1px; background:#f1f5f9; z-index:0;"></div>
                  <div style="position:absolute; left:0; top:80px; right:0; height:1px; background:#f1f5f9; z-index:0;"></div>
                  <div style="position:absolute; left:0; top:120px; right:0; height:1px; background:#f1f5f9; z-index:0;"></div>

                  <!-- Mock Bars -->
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:80px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Mon</div>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:60px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Tue</div>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:140px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Wed</div>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:90px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Thu</div>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:110px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Fri</div>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:40px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Sat</div>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; z-index:1;">
                    <div style="width:24px; height:50px; background:var(--system-blue); border-radius:4px 4px 0 0; opacity:0.8;"></div>
                    <div style="font-size:10px; color:var(--tx3); margin-top:8px;">Sun</div>
                  </div>

                </div>
              </div>

              <!-- Right: Donut Chart -->
              <div class="skc" style="flex:1; margin-bottom:0; padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column; align-items:center;">
                <div style="font-weight:600; color:var(--tx1); margin-bottom:16px; width:100%;">Token 分布</div>
                <!-- Mock Donut with CSS Conic Gradient -->
                <div style="position:relative; width:120px; height:120px; border-radius:50%; background: conic-gradient(
                  var(--system-blue) 0% 15%, 
                  #10b981 15% 35%, 
                  #e2e8f0 35% 100%
                );">
                  <!-- Inner white circle for donut effect -->
                  <div style="position:absolute; top:20px; left:20px; right:20px; bottom:20px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column;">
                    <span style="font-size:18px; font-weight:700; color:var(--tx1);">12M</span>
                    <span style="font-size:10px; color:var(--tx3);">Tokens</span>
                  </div>
                </div>
                
                <div style="margin-top:20px; width:100%; font-size:12px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:var(--tx2);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--system-blue);margin-right:6px;"></span>Input</span>
                    <span style="font-weight:600; color:var(--tx1);">15% (1.8M)</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:var(--tx2);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;"></span>Output</span>
                    <span style="font-weight:600; color:var(--tx1);">20% (2.4M)</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span style="color:var(--tx2);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e2e8f0;margin-right:6px;"></span>Cache Hit</span>
                    <span style="font-weight:600; color:var(--tx1);">65% (7.8M)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Data Table -->
            <div class="skc" style="padding:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="font-weight:600; color:var(--tx1); margin-bottom:16px;">明细数据 (Recent Tasks)</div>
              <table style="width:100%; text-align:left; border-collapse:collapse; font-size:13px;">
                <thead>
                  <tr style="border-bottom:1px solid #f1f5f9; color:var(--tx3);">
                    <th style="padding:12px 0; font-weight:500;">任务名称 (Job Name)</th>
                    <th style="padding:12px 0; font-weight:500;">执行次数</th>
                    <th style="padding:12px 0; font-weight:500;">Input</th>
                    <th style="padding:12px 0; font-weight:500;">Output</th>
                    <th style="padding:12px 0; font-weight:500;">Cache Hit</th>
                    <th style="padding:12px 0; font-weight:500; text-align:right;">总消耗 ($)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom:1px solid #f8fafc;">
                    <td style="padding:12px 0; font-weight:500; color:var(--tx1);">x-radar-collect</td>
                    <td style="padding:12px 0; color:var(--tx2);">60</td>
                    <td style="padding:12px 0; color:var(--tx2);">240k</td>
                    <td style="padding:12px 0; color:var(--tx2);">120k</td>
                    <td style="padding:12px 0; color:#10b981;">1.2M</td>
                    <td style="padding:12px 0; font-weight:600; color:var(--tx1); text-align:right;">.20</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f8fafc;">
                    <td style="padding:12px 0; font-weight:500; color:var(--tx1);">daily-digest-news</td>
                    <td style="padding:12px 0; color:var(--tx2);">30</td>
                    <td style="padding:12px 0; color:var(--tx2);">180k</td>
                    <td style="padding:12px 0; color:var(--tx2);">80k</td>
                    <td style="padding:12px 0; color:#10b981;">800k</td>
                    <td style="padding:12px 0; font-weight:600; color:var(--tx1); text-align:right;">.90</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0; font-weight:500; color:var(--tx1);">github-issue-triage</td>
                    <td style="padding:12px 0; color:var(--tx2);">120</td>
                    <td style="padding:12px 0; color:var(--tx2);">80k</td>
                    <td style="padding:12px 0; color:var(--tx2);">40k</td>
                    <td style="padding:12px 0; color:#10b981;">300k</td>
                    <td style="padding:12px 0; font-weight:600; color:var(--tx1); text-align:right;">.40</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  </div>

<!-- ===== Frame 10.1-2: 治理 / 监控与统计 (Tab 2) ===== -->
  <div class="fw">
    <h1 class="ft">10.1-b 设置中心 / 治理 <span>监控与统计 (Tab 2: 用量分析)</span></h1>
    <div class="aw">
      <div class="sl">
<nav class="sn">
<div class="sng"><div class="snt">基础</div></div>
<div class="sng"><div class="snt">工作流</div></div>
<div class="sng"><div class="snt">能力</div></div>
<div class="sng"><div class="snt">治理</div>
<div class="sni on">监控与统计</div>
<div class="sni">安全与审批</div>
</div>
</nav>
        <main class="scn" style="background: #F7F8FA;">
          <div class="sch" style="padding-bottom: 0; margin-bottom: 24px;">
            <h1>监控与统计</h1>
            
            <!-- Segmented Control / Tabs -->
            <div style="display:flex; gap:24px; margin-top:16px; border-bottom:1px solid #e1e4e8; padding-bottom:0;">
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(1)">大盘监控 (Dashboard)</div>
              <div style="font-weight:600; color:var(--system-blue); padding-bottom:12px; border-bottom:2px solid var(--system-blue); cursor:pointer;">用量分析 (Usage Breakdown)</div>
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(3)">告警与策略 (Alerts & Policies)</div>
            </div>
          </div>
          
          <div class="ss" style="max-width:960px;">
            <div class="skc" style="padding:24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="font-size:13px; color:var(--tx3); margin-bottom:4px;">统计范围: 定时任务会话累计 (15 Days)</div>
              <div style="font-size:24px; font-weight:700; color:var(--tx1); margin-bottom:24px;">2,845,910 Total Tokens</div>
              
              <div style="display:flex; gap:48px;">
                
                <!-- Left Donut -->
                <div style="position:relative; width:280px; height:280px; flex-shrink:0; border-radius:50%; background: conic-gradient(
                  #ef4444 0% 32.5%,
                  #f59e0b 32.5% 49%,
                  #10b981 49% 62.2%,
                  #3b82f6 62.2% 70.8%,
                  #8b5cf6 70.8% 77.2%,
                  #ec4899 77.2% 82.5%,
                  #6366f1 82.5% 86.8%,
                  #14b8a6 86.8% 90.5%,
                  #0ea5e9 90.5% 93.8%,
                  #64748b 93.8% 100%
                );">
                  <!-- Inner cut out -->
                  <div style="position:absolute; top:40px; left:40px; right:40px; bottom:40px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-direction:column; text-align:center;">
                    <span style="font-size:14px; font-weight:600; color:var(--tx2);">定时任务</span>
                    <span style="font-size:20px; font-weight:700; color:var(--tx1); margin-top:4px;">2.84M</span>
                  </div>
                </div>

                <!-- Right List -->
                <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                  
                  <style>
                    .usage-row { display:flex; align-items:center; padding:8px 12px; border-radius:6px; font-size:13px; }
                    .usage-row:hover { background: #f1f5f9; }
                    .usage-row:not(:last-child) { border-bottom: 1px solid #f8fafc; }
                    .dot { width:8px; height:8px; border-radius:50%; margin-right:12px; }
                  </style>

                  <div class="usage-row">
                    <div class="dot" style="background:#ef4444;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">x-radar-collect</div>
                    <div style="color:var(--tx3);">32.48% (924.5k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#f59e0b;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">daily-digest-news</div>
                    <div style="color:var(--tx3);">16.58% (471.8k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#10b981;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">github-issue-triage</div>
                    <div style="color:var(--tx3);">13.20% (375.6k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#3b82f6;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">auth-watchman</div>
                    <div style="color:var(--tx3);">8.60% (244.7k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#8b5cf6;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">monkey-discovery</div>
                    <div style="color:var(--tx3);">6.40% (182.1k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#ec4899;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">vault-snapshot</div>
                    <div style="color:var(--tx3);">5.30% (150.8k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#6366f1;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">builder-briefing</div>
                    <div style="color:var(--tx3);">4.30% (122.3k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#14b8a6;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">outpost-mirror</div>
                    <div style="color:var(--tx3);">3.70% (105.2k)</div>
                  </div>
                  <div class="usage-row">
                    <div class="dot" style="background:#0ea5e9;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx1);">robin-weekly-brief</div>
                    <div style="color:var(--tx3);">3.30% (93.9k)</div>
                  </div>
                  <div class="usage-row" style="margin-top:auto;">
                    <div class="dot" style="background:#64748b;"></div>
                    <div style="flex:1; font-weight:500; color:var(--tx3);">其他 Others (32 个任务)</div>
                    <div style="color:var(--tx3);">6.14% (174.6k)</div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  </div>

<!-- ===== Frame 10.1-3: 治理 / 监控与统计 (Tab 3) ===== -->
  <div class="fw">
    <h1 class="ft">10.1-c 设置中心 / 治理 <span>监控与统计 (Tab 3: 告警与策略)</span></h1>
    <div class="aw">
      <div class="sl">
<nav class="sn">
<div class="sng"><div class="snt">基础</div></div>
<div class="sng"><div class="snt">工作流</div></div>
<div class="sng"><div class="snt">能力</div></div>
<div class="sng"><div class="snt">治理</div>
<div class="sni on">监控与统计</div>
<div class="sni">安全与审批</div>
</div>
</nav>
        <main class="scn" style="background: #F7F8FA;">
           <div class="sch" style="padding-bottom: 0; margin-bottom: 24px;">
            <h1>监控与统计</h1>
            
            <!-- Segmented Control / Tabs -->
            <div style="display:flex; gap:24px; margin-top:16px; border-bottom:1px solid #e1e4e8; padding-bottom:0;">
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(1)">大盘监控 (Dashboard)</div>
              <div style="color:var(--tx3); padding-bottom:12px; cursor:pointer;" onclick="switchTab(2)">用量分析 (Usage Breakdown)</div>
              <div style="font-weight:600; color:var(--system-blue); padding-bottom:12px; border-bottom:2px solid var(--system-blue); cursor:pointer;">告警与策略 (Alerts & Policies)</div>
            </div>
          </div>
          
          <div class="ss" style="max-width:960px;">
          
            <!-- 原有功能兜底保留 -->
            <div class="skc" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <h3>用量告警水位 (Quota & Billing Alert)</h3>
              <div class="fg"><label class="fl">日均 Token 警戒阈值</label><input type="text" class="fi" value="200,000">
                <div class="fd">包含输入和输出。超过后将拒绝无权 Cron 触发器。</div>
              </div>
              <div class="fg"><label class="fl">预估经费提醒限制 (基于官方挂牌价)</label><input type="text" class="fi" value=".50 / Day">
              </div>
            </div>
            <div class="skc" style="box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
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

          </div>
        </main>
      </div>
    </div>
  </div>
'''

with open('docs/figma-review/kaitianclaw-design-board.html', 'w', encoding='utf-8') as f:
    f.write(before + new_content + "\n" + after)

print("Successfully injected Frame 10.1 tabs")
