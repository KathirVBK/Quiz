from dotenv import load_dotenv
load_dotenv()

from crewai import Crew
from agents import reader, question, evaluation, feedback
from tasks import create_task1, create_task2, create_task3, create_task4
from inputhandler import get_user_input, collect_answers
import os

# ── Save results to memory/results.txt ────────────────────────────
def save_result(content, result):
    os.makedirs("memory", exist_ok=True)
    with open("memory/results.txt", "a") as f:
        f.write(f"\n{'='*60}\n")
        f.write(f"Topic/Content: {content}\n")
        f.write(f"Result:\n{result}\n")

# ── Step 1: Get user input ─────────────────────────────────────────
content, task1_description, num_questions, difficulty, input_type = get_user_input()

# ── Step 2: Create tasks 1 & 2 ────────────────────────────────────
task1 = create_task1(task1_description, input_type=input_type)
task2 = create_task2(task1, num_questions=num_questions, difficulty=difficulty)

# ── Step 3: Run Crew 1 (read + generate quiz) ─────────────────────
crew1 = Crew(
    agents=[reader, question],
    tasks=[task1, task2],
    verbose=True
)
crew1.kickoff(inputs={"content": content})

# ── Step 4: Collect user answers ──────────────────────────────────
answer = collect_answers(task2.output)

# ── Step 5: Create tasks 3 & 4 ────────────────────────────────────
task3 = create_task3(answer, task2)
task4 = create_task4(task3)

# ── Step 6: Run Crew 2 (evaluate + feedback) ──────────────────────
crew2 = Crew(
    agents=[evaluation, feedback],
    tasks=[task3, task4],
    verbose=True
)
result = crew2.kickoff()
print(result)

# ── Step 7: Save result ───────────────────────────────────────────
save_result(content, result)
print("\n✅ Result saved to memory/results.txt")