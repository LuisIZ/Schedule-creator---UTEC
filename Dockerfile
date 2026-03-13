# Lightweight Python Image
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy dependency file
COPY requirements.txt .

# Install dependencies (ignoring warnings for clean build)
RUN pip install --no-cache-dir -r requirements.txt

# Copy remaining code
COPY . .

# Ensure Data folder exists and wait for user to put PDFs there
# Or if PDFs are already in the copy, they'll be processed

# Environment variables
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production

# Expose backend port
EXPOSE 5000

# Start command
CMD ["python", "backend/app.py"]
