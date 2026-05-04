# Build Flutter web and serve from /flutter/ behind Traefik (no StripPrefix)
FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .
ARG API_BASE_URL=
ARG GEMINI_API_KEY=
RUN flutter build web --release --base-href /flutter/ \
  --dart-define=API_BASE_URL=${API_BASE_URL} \
  --dart-define=GEMINI_API_KEY=${GEMINI_API_KEY} \
  --no-web-resources-cdn

FROM nginx:1.27-alpine
COPY --from=build /app/build/web /usr/share/nginx/html/flutter
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
