# Use a minimal Debian base image
FROM debian:buster-slim

# Install C++ compiler (g++) and build essentials
# This step is critical as slim images don't come with compilers pre-installed
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Create a non-root user for security
RUN useradd -ms /bin/bash appuser
USER appuser

# Default command for the container
CMD ["g++"]