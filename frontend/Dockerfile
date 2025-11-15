# ========================================
# ETAP 1: Builder - budowanie aplikacji React
# ========================================
FROM node:20-alpine as builder

WORKDIR /app

# Kopiujemy pliki konfiguracyjne (warstwa cache!)
COPY package*.json ./

# Instalujemy WSZYSTKIE zależności (Vite potrzebuje devDependencies do budowania!)
RUN npm ci

# Kopiujemy resztę kodu
COPY . .

# ARG - zmienne używane podczas budowania (można nadpisać w Azure)
ARG VITE_AUTH_API=http://localhost:8000
ARG VITE_MOVIES_API_URL=http://localhost:8001

# Ustawiamy jako ENV żeby Vite je zobaczył podczas budowania
ENV VITE_AUTH_API=$VITE_AUTH_API
ENV VITE_MOVIES_API_URL=$VITE_MOVIES_API_URL

# Budujemy aplikację produkcyjną (tworzy folder dist/)
# Vite podmienia import.meta.env.VITE_* na rzeczywiste wartości!
RUN npm run build

# ========================================
# ETAP 2: Runtime - Nginx do serwowania
# ========================================
FROM nginx:1.25-alpine

# Kopiujemy zbudowaną aplikację z buildera
COPY --from=builder /app/dist /usr/share/nginx/html

# Kopiujemy naszą konfigurację Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Eksponujemy port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Nginx startuje automatycznie
CMD ["nginx", "-g", "daemon off;"]