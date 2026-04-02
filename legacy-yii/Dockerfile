FROM php:8.2-cli-alpine

WORKDIR /app

RUN docker-php-ext-install pdo pdo_mysql

ENV PHP_CLI_SERVER_WORKERS=4

COPY . .

EXPOSE 8080

CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "public/index.php"]
