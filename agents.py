from crewai import Agent, LLM
from tools import read_tool, search_tool
import os
from dotenv import load_dotenv

load_dotenv()

llm = LLM(
    model="gpt-4.1-nano",
    temperature=0.6,
    base_url="https://apidev.navigatelabsai.com",
    api_key=os.getenv("LLM_API_KEY")
)

reader = Agent(
    role="Content reader and web researcher",
    goal="Read content or PDF documents, extract core concepts, and use search_tool to gather deeper context for any concepts with shallow or brief explanations.",
    backstory=(
        "Expert educational researcher. Skilled at analyzing texts and PDFs to extract key concepts, "
        "identifying terms or topics with insufficient detail (e.g. brief mentions of technical terms), "
        "and actively using the search_tool to find comprehensive explanations so high-quality quiz questions can be created."
    ),
    tools=[read_tool, search_tool],
    llm=llm,
    verbose=True
)

question = Agent(
    role="Quiz generator for students from the given content",
    goal="To generate the question based on the given content easy to hard for students to upskill their knowledge",
    backstory="Expert in generating quiz based on the content provided from the provided topic",
    tools=[],
    llm=llm,
    verbose=True
)

evaluation = Agent(
    role="Evaluator",
    goal="Need to evaluate the correct answer for the quiz and provide the total marks",
    backstory="Expert in grading quiz",
    tools=[],
    llm=llm,
    verbose=True
)

feedback = Agent(
    role="Performance reviewer",
    goal="Need to review the performance of the current quiz and provide tips to improve based on the grade.",
    backstory="Expert in giving review on the quiz performance",
    tools=[],
    llm=llm,
    verbose=True
)