# ==========================================
# Etapa 1: Builder (Construcción)
# ==========================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Crear un entorno virtual para aislar las dependencias
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copiar el archivo de dependencias e instalar [cite: 4, 5]
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==========================================
# Etapa 2: Producción (Runner)
# ==========================================
FROM python:3.11-slim

# 1. SEGURIDAD: Crear un usuario sin privilegios (no-root)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Configurar el directorio de trabajo 
WORKDIR /app

# Copiar solo el entorno virtual ya construido desde la Etapa 1
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copiar el resto del código y asignar propiedad al usuario no-root
COPY --chown=appuser:appgroup . .

# Variables de entorno 
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production
# Evita que Python guarde en buffer los logs (útil para ver errores en tiempo real)
ENV PYTHONUNBUFFERED=1 

# 2. SEGURIDAD: Cambiar al usuario sin privilegios
USER appuser

# Exponer el puerto del backend 
EXPOSE 5000

# 3. SEGURIDAD: Healthcheck para monitorear si la app está viva
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/') or exit(1)"

# Comando de inicio original 
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--chdir", "backend", "app:app"]