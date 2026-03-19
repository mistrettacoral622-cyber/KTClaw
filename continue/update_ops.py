import json
from datetime import datetime
import os

repo_dir = r"C:\Users\22688\Desktop\KTClaw-main"
progress_file = os.path.join(repo_dir, "continue", "progress.txt")
task_file = os.path.join(repo_dir, "continue", "task.json")

def update_progress():
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M +08:00")
    entry = f"""
[{now_str}] Session: DESIGN-017 Layout Innovation
Focus: Redesign the core Team layouts away from standard grids and vertical trees.

What changed:
- Frame 2 (Staff Overview): Replaced the standard CSS grid with a modern asymmetric Bento Box dashboard format. Created a `hero` card (Main Orchestrator) that spans 2x2 grid spaces with a prominent avatar and typography. Added a `wide` card type spanning 3 columns. This establishes a clear hierarchy based on Agent capabilities.
- Frame 3 (Team Map): Rewrote the CSS for `.tree` to flow Left-to-Right (Horizontal Mind Map) instead of Top-Down. This utilizes horizontal screen real-estate much better for long agent names and allows an infinite horizontal scroll rather than a narrow vertical scroll.

Results:
- Both frames feel distinctly more like a professional orchestrator tooling interface rather than a generic template.

Blockers:
- None.

Next recommended step:
- Review the layout changes with user. Convert to React if approved.
"""
    with open(progress_file, "a", encoding="utf-8") as f:
        f.write(entry)

def update_task_json():
    with open(task_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Add DESIGN-017 if missing
    tasks = data.get("tasks", [])
    has_017 = any(t["id"] == "DESIGN-017" for t in tasks)
    if not has_017:
        tasks.append({
          "id": "DESIGN-017",
          "title": "Layout Innovation",
          "type": "design",
          "status": "done",
          "priority": "P0",
          "depends_on": ["DESIGN-016"],
          "description": "Implement asymmetric Bento Box layout for Team Overview and Left-to-Right horizontal tree for Team Map.",
          "acceptance_criteria": [
            "Team Overview uses hero and wide cards to break grid monotony",
            "Team Map flows horizontally from left to right"
          ],
          "notes": "Requested by user to innovate structurally on the list and map views.",
          "subtasks": []
        })
    else:
        for t in tasks:
            if t["id"] == "DESIGN-017":
                t["status"] = "done"

    data["tasks"] = tasks

    with open(task_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    update_progress()
    update_task_json()
    print("Updated progress.txt and task.json for DESIGN-017")
