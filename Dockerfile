FROM swift:5.3-focal as build

RUN export DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true \
    && apt-get -q update \
    && apt-get -q dist-upgrade -y \
    && apt-get install -y --no-install-recommends libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY ./Package.* ./
RUN swift package resolve
COPY . .
RUN swift build --enable-test-discovery -c release

WORKDIR /staging

RUN cp "$(swift build --package-path /build -c release --show-bin-path)/Run" ./
RUN mv /build/Public ./Public && chmod -R a-w ./Public \
    && mv /build/Resources ./Resources && chmod -R a-w ./Resources \
    && chmod g+w ./Resources/Temp

FROM swift:5.3-focal-slim

ARG HOST_DOCKER_GROUP_ID

RUN useradd --user-group --create-home --system --skel /dev/null --home-dir /app vapor

RUN groupadd docker -g ${HOST_DOCKER_GROUP_ID} && \
    usermod -a -G docker vapor

RUN export DEBIAN_FRONTEND=noninteractive DEBCONF_NONINTERACTIVE_SEEN=true && \
    apt-get -q update && apt-get -q dist-upgrade -y && rm -r /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - \ 
    && add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    && apt-get update && apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io

WORKDIR /app
COPY --from=build /staging /app

EXPOSE 8080

ENTRYPOINT ["./Run"]
CMD ["serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "8080"]
