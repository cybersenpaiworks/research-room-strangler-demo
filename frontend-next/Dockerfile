FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package.json
RUN npm install

FROM deps AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_GATEWAY_URL
ARG NEXT_PUBLIC_SOCKET_PATH
ARG NEXT_PUBLIC_DEFAULT_SESSION_ID
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
ENV NEXT_PUBLIC_SOCKET_PATH=${NEXT_PUBLIC_SOCKET_PATH}
ENV NEXT_PUBLIC_DEFAULT_SESSION_ID=${NEXT_PUBLIC_DEFAULT_SESSION_ID}
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
