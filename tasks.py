from crewai import Task
from agents import reader, question, evaluation, feedback


def create_task1(task1_description, input_type="topic"):
    if input_type == "pdf":
        description = f"""{task1_description}

CRITICAL INSTRUCTIONS FOR PDF CONTENT ANALYSIS & WEB SEARCH ENRICHMENT:
1. Thoroughly read and extract all key concepts, definitions, processes, and technical terms from the provided PDF content.
2. CONCEPT SENSING & SEARCH REQUIREMENT: For any key term or concept in the PDF (for example: "Few shot prompting", "Fine-tuning", "RAG", etc.) that has only a brief, surface-level, or shallow explanation in the PDF:
   - YOU MUST USE THE search_tool (Serper Search) TO SEARCH FOR THE CONCEPT ON THE WEB.
   - Gather detailed definitions, working mechanisms, real-world examples, and key features from the web search results.
3. Combine the extracted PDF content with your web search findings into a rich, structured educational summary.
4. Highlight both the PDF's primary takeaways AND the search-enriched concept explanations clearly so comprehensive quiz questions can be created.
"""
    elif input_type == "text":
        description = f"""{task1_description}

INSTRUCTIONS:
1. Carefully read and summarize the provided text.
2. If any key technical terms or concepts are mentioned with minimal explanation, use search_tool to enrich your understanding.
"""
    else:
        description = task1_description

    return Task(
        description=description,
        expected_output="A clear, comprehensive, and search-enriched summary of all key concepts from the content",
        agent=reader
    )


def create_task2(task1, num_questions=3, difficulty="Medium"):
    return Task(
        description=f"""Generate exactly {num_questions} quiz questions with {difficulty} difficulty based on the provided content.
Requirements:
1. Generate exactly {num_questions} questions with {difficulty} difficulty level.
2. For each question, provide 4 options labeled A, B, C, D.
3. CRITICAL: Distribute the correct answer evenly and randomly across options A, B, C, and D. Do NOT over-rely on option B or any single option.
4. Do NOT reveal the correct answers in the output questions text.
""",
        expected_output=f"""A formatted list of {num_questions} questions, each with 4 distinct options (A, B, C, D). Format each question clearly as:
Question 1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
""",
        agent=question,
        context=[task1]
    )


def create_task3(answer, task2):
    return Task(
        description=f"""
You are given quiz questions and the user's answers.

User Answers: {answer}

Evaluate each answer strictly. For EACH question output EXACTLY this format:

Question [N]: [Question text]
User Answer: [what the user chose]
Result: Correct  OR  Incorrect
Correct Answer: [The correct option letter and text]  <-- ALWAYS show this, even if correct
Reason: [1-2 sentence explanation of WHY that option is correct]

At the end, on a new line, output ONLY:
Score: [X] / [Total]
""",
        expected_output="""Per-question evaluation showing Result, Correct Answer, and Reason for every question, followed by a final Score line.""",
        agent=evaluation,
        context=[task2]
    )


def create_task4(task3):
    return Task(
        description="""
You are given the quiz evaluation result.

Write a SHORT, CONCISE performance review using ONLY bullet points. No paragraphs.

Format EXACTLY like this:

Strengths:
- [one strength]
- [one strength if applicable]

Weak Areas:
- [one weak area]
- [one weak area if applicable]

Tips to Improve:
- [one actionable tip]
- [one actionable tip]
- [one actionable tip]

Rules:
- Maximum 3 bullets per section
- Each bullet must be one short sentence
- Do NOT write paragraphs or summaries
- Do NOT assume scores; use only the evaluation provided
""",
        expected_output="Concise bullet-point feedback with Strengths, Weak Areas, and Tips to Improve sections.",
        agent=feedback,
        context=[task3]
    )