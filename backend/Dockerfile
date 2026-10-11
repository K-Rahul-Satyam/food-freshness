FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (headless OpenCV does not require X11/libgl1)
RUN apt-get update -o Acquire::Retries=3 && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
