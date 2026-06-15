FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl dumb-init procps net-tools \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g genieacs@1.2.13

RUN useradd -r -u 999 -g root genieacs \
 && mkdir -p /var/log/genieacs /opt/genieacs/ext \
 && chown -R genieacs:root /var/log/genieacs /opt/genieacs

USER genieacs

ENV GENIEACS_MONGODB_CONNECTION_URL=mongodb://genieacs-mongo:27017/genieacs
ENV GENIEACS_CWMP_INTERFACE=0.0.0.0
ENV GENIEACS_NBI_INTERFACE=0.0.0.0
ENV GENIEACS_FS_INTERFACE=0.0.0.0
ENV GENIEACS_UI_INTERFACE=0.0.0.0
ENV GENIEACS_UI_JWT_SECRET=ChangeMeGenieUiJwtSecret

EXPOSE 7547 7557 7567 3000

ENTRYPOINT ["dumb-init", "--"]
