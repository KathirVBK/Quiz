from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    histories = relationship("QuizHistory", back_populates="owner")

class QuizHistory(Base):
    __tablename__ = "quiz_histories"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    raw_quiz = Column(Text) # The generated quiz text
    user_answers = Column(Text) # JSON string of answers
    evaluation_result = Column(Text)
    feedback = Column(Text)
    score = Column(String)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="histories")
