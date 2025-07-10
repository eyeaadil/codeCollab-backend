# Use a minimal base image for Python 3.9
# python:3.9-slim-buster provides a smaller image size compared to full python image
FROM python:3.9-slim-buster

# Set the working directory inside the container
# This is where your code will be copied and executed
WORKDIR /app

# Create a non-root user for enhanced security
# Running processes as root within a container is generally discouraged.
# This creates a user 'appuser' with a home directory and sets it as the current user.
RUN useradd -ms /bin/bash appuser
USER appuser

# Define the default command to execute when the container starts without a specific command.
# For our use case, the backend will provide the exact command and arguments.
# This line is mostly for image usability outside of this specific context.
CMD ["python3"]