from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import timedelta
import json
import os

from crewai import Crew
from agents import reader, question, evaluation, feedback
from tasks import create_task1, create_task2, create_task3, create_task4
from pdf_handler import extract_text_from_pdf

import database
import models
import auth

# Initialize DB
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Quiz AI API")

frontend_url = os.environ.get("FRONTEND_URL", "")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
]
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# Store state between calls for quiz generation
sessions = {}

class GenerateRequest(BaseModel):
    session_id: str
    topic: str
    is_text: bool = False
    input_type: str = "topic"
    num_questions: int = 3
    difficulty: str = "Medium"

class EvaluateRequest(BaseModel):
    session_id: str
    user_answers: list[str]
    topic: str

class UserCreate(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter((models.User.username == user.username) | (models.User.email == user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, username=user.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/login")
def login(user_login: UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(
        (models.User.username == user_login.username) | (models.User.email == user_login.username)
    ).first()
    if not user or not auth.verify_password(user_login.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email, username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/history")
def get_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    histories = db.query(models.QuizHistory).filter(models.QuizHistory.owner_id == current_user.id).order_by(models.QuizHistory.timestamp.desc()).all()
    return histories

@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        file_path = os.path.join(temp_dir, file.filename)
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        extracted_text = extract_text_from_pdf(file_path)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {
            "filename": file.filename,
            "text": extracted_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

@app.post("/generate_quiz")
async def generate_quiz(req: GenerateRequest, current_user: models.User = Depends(get_current_user)):
    try:
        content = req.topic
        inp_type = req.input_type
        if req.is_text and inp_type == "topic":
            inp_type = "text"

        safe_content = content.replace("{", "{{").replace("}", "}}")

        if inp_type == "pdf":
            task1_description = (
                f"Analyze the following PDF content carefully. Extract key concepts, definitions, and processes. "
                f"CRITICAL REQUIREMENT: For any concept or technical term in the PDF (such as 'Few shot prompting', 'Chain of thought', etc.) "
                f"that has only a brief or shallow explanation, YOU MUST USE search_tool to search the web and gather rich additional context:\n\n{safe_content}"
            )
        elif inp_type == "text":
            task1_description = f"Read and summarize the following content:\n{safe_content}"
        else:
            task1_description = f"Search and summarize key concepts about: {safe_content}"

        task1 = create_task1(task1_description, input_type=inp_type)
        task2 = create_task2(task1, num_questions=req.num_questions, difficulty=req.difficulty)

        crew1 = Crew(
            agents=[reader, question],
            tasks=[task1, task2],
            verbose=True
        )
        
        crew1.kickoff(inputs={"content": safe_content})
        
        sessions[req.session_id] = task2
        
        return {"questions_text": str(task2.output)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate_quiz")
async def evaluate_quiz(req: EvaluateRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(database.get_db)):
    try:
        if req.session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found. Did you generate a quiz first?")
            
        task2 = sessions[req.session_id]
        
        answers_str = "\\n".join([f"Q{i+1}: {ans}" for i, ans in enumerate(req.user_answers)])
        
        task3 = create_task3(answers_str, task2)
        task4 = create_task4(task3)
        
        crew2 = Crew(
            agents=[evaluation, feedback],
            tasks=[task3, task4],
            verbose=True
        )
        
        result = crew2.kickoff()
        
        evaluation_text = str(task3.output) if task3.output else ""
        feedback_text = str(task4.output) if task4.output else ""

        # Extract score
        import re
        score_match = re.search(r"Score:\s*(\d+\s*/\s*\d+)", evaluation_text, re.IGNORECASE)
        score = score_match.group(1) if score_match else "N/A"

        # Save to DB
        history_entry = models.QuizHistory(
            topic=req.topic,
            raw_quiz=str(task2.output),
            user_answers=json.dumps(req.user_answers),
            evaluation_result=evaluation_text,
            feedback=feedback_text,
            score=score,
            owner_id=current_user.id
        )
        db.add(history_entry)
        db.commit()
        
        return {
            "evaluation": evaluation_text,
            "feedback": feedback_text
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)
