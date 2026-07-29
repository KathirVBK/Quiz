def get_user_input():
    input_type = input("Enter input type (topic/text/pdf): ").strip().lower()

    if input_type == "topic":
        content = input("Enter your topic:\n")
        task1_description = f"Search and summarize key concepts about: {content}"

    elif input_type == "text":
        content = input("Enter your text:\n").replace("{", "{{").replace("}", "}}")
        task1_description = f"Read and summarize the following content:\n{content}"

    elif input_type == "pdf":
        file_path = input("Enter path to PDF file:\n").strip().strip('"').strip("'")
        from pdf_handler import extract_text_from_pdf
        try:
            raw_content = extract_text_from_pdf(file_path)
            content = raw_content.replace("{", "{{").replace("}", "}}")
            task1_description = f"Analyze the following PDF content (File: {file_path}). Extract core concepts and use web search for any shallow explanations:\n\n{content}"
        except Exception as e:
            print(f"❌ Error reading PDF: {e}")
            exit()

    else:
        print("Invalid input type. Please enter 'topic', 'text', or 'pdf'.")
        exit()

    num_questions_input = input("Enter number of questions (default 3): ").strip()
    num_questions = int(num_questions_input) if num_questions_input.isdigit() else 3
    difficulty = input("Enter difficulty (Easy/Medium/Hard, default Medium): ").strip().capitalize() or "Medium"

    print(f"Input type: {input_type} | Questions: {num_questions} | Difficulty: {difficulty}")
    return content, task1_description, num_questions, difficulty, input_type


def collect_answers(task2_output):
    answer = []
    questions_output = str(task2_output)

    print("\nAnswer the following questions:\n")

    for line in questions_output.split("\n"):
        if "?" in line:
            ans = input(line + "\nYour answer: ")
            answer.append(ans)

    return answer