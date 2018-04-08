FROM ubuntu:16.04
LABEL maintainer="Katsumi Kishikawa <kishikawakatsumi@mac.com>"
LABEL Description="Docker Container for the Apple's Swift programming language"

# Install related packages and set LLVM 3.8 as the compiler
RUN apt-get -q update && \
    apt-get -q install -y \
    make \
    libc6-dev \
    clang-3.8 \
    curl \
    libedit-dev \
    libpython2.7 \
    libicu-dev \
    libssl-dev \
    libxml2 \
    tzdata \
    git \
    libcurl4-openssl-dev \
    pkg-config \
    && update-alternatives --quiet --install /usr/bin/clang clang /usr/bin/clang-3.8 100 \
    && update-alternatives --quiet --install /usr/bin/clang++ clang++ /usr/bin/clang++-3.8 100 \
    && rm -r /var/lib/apt/lists/*

ARG SWIFT_PLATFORM=ubuntu16.04
ARG SWIFT_BRANCH=swift-3.1.1-release
ARG SWIFT_VERSION=swift-3.1.1-RELEASE

ENV SWIFT_PLATFORM=$SWIFT_PLATFORM \
    SWIFT_BRANCH=$SWIFT_BRANCH \
    SWIFT_VERSION=$SWIFT_VERSION

RUN SWIFT_URL=https://swift.org/builds/$SWIFT_BRANCH/$(echo "$SWIFT_PLATFORM" | tr -d .)/$SWIFT_VERSION/$SWIFT_VERSION-$SWIFT_PLATFORM.tar.gz \
    && curl -fSsL $SWIFT_URL -o swift.tar.gz \
    && curl -fSsL $SWIFT_URL.sig -o swift.tar.gz.sig \
    && export GNUPGHOME="$(mktemp -d)" \
    && tar -xzf swift.tar.gz --directory / --strip-components=1 \
    && rm -r "$GNUPGHOME" swift.tar.gz.sig swift.tar.gz \
    && chmod -R o+r /usr/lib/swift

# Print Installed Swift Version
RUN swift --version
