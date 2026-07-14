FROM python:3.12-alpine AS version

WORKDIR /workspace
COPY build_web_version.py ./
COPY web ./web
RUN python3 build_web_version.py

FROM nginx:1.27-alpine

COPY --from=version /workspace/web /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8877

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8877/ || exit 1