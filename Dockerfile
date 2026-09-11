FROM debian:bookworm-slim

ARG HUGO_VERSION=0.165.0

RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates wget && \
    rm -rf /var/lib/apt/lists/* && \
    wget -q -O /tmp/hugo.tar.gz \
      "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" && \
    tar -xzf /tmp/hugo.tar.gz -C /usr/local/bin hugo && \
    chmod +x /usr/local/bin/hugo && \
    rm /tmp/hugo.tar.gz

WORKDIR /src

EXPOSE 1313

CMD ["hugo", "server", "--bind", "0.0.0.0", "--port", "1313", "--buildDrafts", "--buildFuture"]