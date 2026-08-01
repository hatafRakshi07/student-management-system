FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create upload directories
RUN mkdir -p uploads/photos uploads/submissions uploads/assignments

EXPOSE 8000

CMD ["python", "run.py"]
