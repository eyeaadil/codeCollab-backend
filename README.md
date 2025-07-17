# CodeCollab Backend

Backend server for the CodeCollab real-time collaborative code editor.

## Features

- User authentication and authorization
- Real-time code collaboration via WebSockets
- File and folder management
- Code execution for multiple languages
- Room-based collaboration

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- WebSockets (ws)
- JWT Authentication

## Deployment to Render.com

### Prerequisites

1. Create a [Render.com](https://render.com) account
2. Set up a MongoDB database (Atlas or other provider)

### Deployment Steps

#### Option 1: Using the Dashboard

1. Log in to your Render.com account
2. Click on "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: `codecollab-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`
5. Add the following environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will automatically assign a port)
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret key
   - `FRONTEND_URL`: URL of your frontend application
   - `EMAIL_HOST`: SMTP server (e.g., smtp.gmail.com)
   - `EMAIL_PORT`: SMTP port (e.g., 587)
   - `EMAIL_USER`: Your email address
   - `EMAIL_PASS`: Your email password or app password
6. Click "Create Web Service"

#### Option 2: Using render.yaml (Blueprint)

1. Push the `render.yaml` file to your repository
2. Log in to your Render.com account
3. Click on "New" and select "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file and create the service
6. Add the required environment variables that are marked as `sync: false` in the dashboard

### Updating the Frontend

After deploying the backend, update your frontend application to use the new WebSocket URL:

```javascript
// Before
const socket = new WebSocket(`ws://localhost:4000?token=${token}`);

// After
const socket = new WebSocket(`wss://your-render-app-name.onrender.com/ws?token=${token}`);
```

Also update your API endpoints:

```javascript
// Before
const API_URL = 'http://localhost:5000/api';

// After
const API_URL = 'https://your-render-app-name.onrender.com/api';
```

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Start the development server: `npm run dev`

## API Endpoints

- `/api/auth` - Authentication routes
- `/api/collaborate` - Collaboration routes
- `/api/folders` - Folder management
- `/api/files` - File management
- `/api/execute-code` - Code execution

## WebSocket Protocol

The WebSocket server is available at `/ws` and requires a JWT token for authentication:

```
wss://your-render-app-name.onrender.com/ws?token=your_jwt_token
```

### WebSocket Messages

- `join`: Join a collaboration room
- `update`: Update file content
- `getContent`: Request current file content