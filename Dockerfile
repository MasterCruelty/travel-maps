FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css game.js sw.js manifest.webmanifest og.png /usr/share/nginx/html/
COPY icons/ /usr/share/nginx/html/icons/
COPY data/ /usr/share/nginx/html/data/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
