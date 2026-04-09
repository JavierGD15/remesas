# =============================================================
# DON ALEX — Frontend Dockerfile (desarrollo)
# Node 20 + Vite dev server con HMR.
# Zero Trust: variables se inyectan en tiempo de ejecución.
# =============================================================

FROM node:20-alpine AS development

WORKDIR /app

# Instalar dependencias primero (capa cacheada)
COPY package*.json ./
RUN npm ci

# El código fuente se monta como volumen en dev
ENV NODE_ENV=development

EXPOSE 5173

# Vite escucha en todas las interfaces para que Docker pueda exponerlo
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
