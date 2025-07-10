# Use a minimal base image for Node.js 18
FROM node:18-slim

# Set the working directory in the container
WORKDIR /app

# Create a non-root user for security
RUN useradd -ms /bin/bash appuser
USER appuser

# Default command for the container
CMD ["node"]