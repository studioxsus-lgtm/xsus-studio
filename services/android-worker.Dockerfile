FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless curl unzip ca-certificates && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=/opt/gradle/gradle-8.9/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/build-tools/35.0.0:$PATH
RUN mkdir -p /opt/android-sdk/cmdline-tools /opt/gradle && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/sdk.zip && unzip -q /tmp/sdk.zip -d /tmp/sdk && mv /tmp/sdk/cmdline-tools /opt/android-sdk/cmdline-tools/latest && rm -rf /tmp/sdk /tmp/sdk.zip
RUN yes | sdkmanager --licenses >/dev/null && sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
RUN curl -fsSL https://services.gradle.org/distributions/gradle-8.9-bin.zip -o /tmp/gradle.zip && unzip -q /tmp/gradle.zip -d /opt/gradle && rm /tmp/gradle.zip
WORKDIR /app
COPY --chown=node:node services/src/build-worker/ ./services/src/build-worker/
RUN printf '{"type":"module"}\n' > package.json && chown node:node /app
ENV XSUS_GRADLE_EXECUTABLE=/opt/gradle/gradle-8.9/bin/gradle
USER node
CMD ["node","services/src/build-worker/standalone-worker.js"]
