#!/bin/sh
# Picks the nginx mode before nginx starts.
#   TLS_DOMAIN unset -> plain HTTP on :80 (works on a bare EC2 public IP)
#   TLS_DOMAIN set   -> HTTPS on :443 with the Let's Encrypt cert if it exists, otherwise a
#                       self-signed one so nginx always boots (issue the real cert with certbot,
#                       then restart this container once).
set -eu

CONF=/etc/nginx/conf.d/default.conf

if [ -z "${TLS_DOMAIN:-}" ]; then
    echo "case2code: HTTP mode (TLS_DOMAIN not set)"
    cp /etc/nginx/case2code/http.conf "$CONF"
    exit 0
fi

LIVE="/etc/letsencrypt/live/${TLS_DOMAIN}"
if [ -f "${LIVE}/fullchain.pem" ] && [ -f "${LIVE}/privkey.pem" ]; then
    export TLS_CERT="${LIVE}/fullchain.pem" TLS_KEY="${LIVE}/privkey.pem"
    echo "case2code: HTTPS mode with the Let's Encrypt certificate for ${TLS_DOMAIN}"
else
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
        -keyout /etc/nginx/ssl/selfsigned.key -out /etc/nginx/ssl/selfsigned.crt \
        -subj "/CN=${TLS_DOMAIN}" -addext "subjectAltName=DNS:${TLS_DOMAIN},DNS:localhost"
    export TLS_CERT=/etc/nginx/ssl/selfsigned.crt TLS_KEY=/etc/nginx/ssl/selfsigned.key
    echo "case2code: HTTPS mode with a SELF-SIGNED certificate (no Let's Encrypt cert yet)"
fi

envsubst '${TLS_DOMAIN} ${TLS_CERT} ${TLS_KEY}' \
    < /etc/nginx/case2code/https.conf.template > "$CONF"

# Pick up renewed certificates without a restart.
( while sleep 12h; do nginx -s reload || true; done ) >/dev/null 2>&1 &
