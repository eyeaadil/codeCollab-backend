FROM debian:buster-slim

# Install C compiler (gcc) and build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Create a non-root user for security
RUN useradd -ms /bin/bash appuser
USER appuser

# Default command for the container
CMD ["gcc"]