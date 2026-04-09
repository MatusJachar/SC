FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --ignore-installed -r requirements.txt || pip install --no-cache-dir fastapi uvicorn motor python-dotenv PyJWT bcrypt aiofiles qrcode python-multipart python-jose

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]