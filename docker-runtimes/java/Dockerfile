# Use a minimal base image for OpenJDK 17
FROM openjdk:17-slim

# Set the working directory in the container
WORKDIR /app

# Create a non-root user for security
RUN useradd -ms /bin/bash appuser
USER appuser

# Default command for the container
# We'll compile then run Java code, so this is just a placeholder.
CMD ["java"]