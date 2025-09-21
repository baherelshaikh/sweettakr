# **SweetTalkr App** 🌟

**SweetTalkr** is a modern, full-stack chat application powered by **Node.js** (Express backend) and **Vite** (React/Vue frontend), seamlessly containerized with *Docker* and *Docker Compose*. The backend efficiently manages API routes and database interactions, while the frontend delivers a *responsive*, user-friendly interface served via *Nginx*. 

> **Note**: This is a **Minimum Viable Product (MVP)**, providing a solid foundation for real-time communication with plans for exciting new features.

### Current Features
- **Text Messaging**: Send and receive text messages in real-time.
- **Chats**: Create and manage chat conversations with multiple users.
- **Message Receipts**: Track delivered and read statuses for messages.
- **Secure Authentication**: JWT-based user authentication for safe access.
- **PostgreSQL Backend**: Robust data management with a scalable database schema.

### Planned Features
- *Media Sharing*: Share images and videos, securely stored and linked via the database.
- *Recording Messages*: Send voice or video message recordings.
- *Voice Calls*: Enable real-time voice communication.
- *Video Calls*: Support face-to-face video interactions for a richer experience.

SweetTalkr is designed to evolve, with ongoing development to enhance user engagement and functionality.

### Tools and Technologies
The following tools and technologies were used to build and deploy SweetTalkr:
- **Core Development**:
  - **Node.js** & **Express**: Backend framework for API routes and logic.
  - **Vite** & **React/Vue**: Fast, modern frontend build tool and framework.
  - **PostgreSQL**: Relational database for structured data storage.
- **Containerization & Deployment**:
  - **Docker**: Containerization for consistent development and production environments.
  - **Docker Compose**: Orchestrates multi-container setup (backend, frontend, database).
  - **Nginx**: High-performance web server for serving the frontend.
- **Authentication & Security**:
  - **JWT (JSON Web Tokens)**: Secure user authentication.
  - **OpenSSL**: For generating secure keys (e.g., JWT_SECRET).
- **Database Management**:
  - **Neon**: Cloud-hosted PostgreSQL services for scalable database hosting.
- **Development Environment**:
  - **VS Code**: Primary code editor, with *Dev Containers* extension for containerized development.
  - **Git** & **GitHub**: Version control and repository hosting.
- **Package Management**:
  - **npm**: For managing dependencies and scripts in both frontend and backend.
- **Key Packages**:
  - **Backend**:
    - `express`: Web framework for building RESTful APIs.
    - `jsonwebtoken`: Implements JWT for secure authentication.
    - `pg`: PostgreSQL client for database queries.
    - `dotenv`: Loads environment variables from `.env`.
    - `cors`: Enables cross-origin requests for frontend-backend communication.
    - `bcryptjs`: Hashes passwords for secure user authentication.
    - `express-async-errors`: Simplifies async error handling in Express.
    - `express-rate-limit`: Limits API requests to prevent abuse.
    - `express-validator`: Validates and sanitizes API inputs.
    - `helmet`: Secures Express apps with HTTP headers.
    - `http-status-codes`: Provides HTTP status code constants.
    - `socket.io`: Enables real-time, bidirectional communication.
    - `socket.io-client`: Client-side library for WebSocket connections.
    - `uuid`: Generates UUIDs for database records (e.g., chat and message IDs).
    - `nodemon` (dev): Auto-restarts server during development.
  - **Frontend**:
    - `react` or `vue`: Framework for building the user interface (framework-agnostic).
    - `vite`: Next-generation frontend tooling for fast builds.
    - `socket.io-client`: Connects to backend WebSocket for real-time updates.
    - `uuid`: Generates UUIDs for client-side operations.

## Prerequisites

Before running the project, ensure you have the following installed:

- **Docker Desktop**: Version 20.10 or higher (with WSL 2 enabled on Windows for optimal performance).
- **Docker Compose**: Version 2.0 or higher (included with Docker Desktop).
- **Node.js**: Version 18 or higher (optional for local development outside Docker).
- **PostgreSQL Database**: An external database instance (e.g., Nhost, Neon, or a local Postgres server). The app uses a \`DATABASE_URL\` environment variable for connection.
- **Git**: For cloning the repository.

No manual ```npm install``` is required—dependencies are installed automatically during the Docker build process.

## Quick Start

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/baherelshaikh/sweettakr
   cd SweetTalkr-App
   ```

2. **Configure Environment Variables**:
   - Copy the example environment Variables from this file:

   - Edit \`.env\` with your Variables:

3. **Build and Run the Project**:
   ```
   docker compose up --build
   ```
   - This builds the images for \`frontend\` and \`backend\` services and starts them in the foreground.
   - To stop: ```docker-compose down``` (add \`--volumes\` to remove data volumes if using local Postgres).

4. **Access the Application**:
   - **Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser (served via Nginx).
   - **Backend API**: Test endpoints at [http://localhost:5000](http://localhost:5000).
   - Logs: View with \`docker-compose logs\` or \`docker-compose logs backend\` for service-specific output.

The app should be fully running in under 2 minutes, with the backend connected to your database and the frontend proxying API calls to the backend.

## Project Structure
```
SweetTalkr-App/
├── backend/                 # Node.js/Express backend
│   ├── Dockerfile           # Builds backend image
│   ├── package.json         # Dependencies (e.g., Express, pg)
│   ├── server.js            # Main server file
│   └── ...                  # Routes, models, etc.
├── frontend/                # Vite-based frontend
│   ├── Dockerfile           # Multi-stage build (Vite → Nginx)
│   ├── package.json         # Dependencies (e.g., Vite, React/Vue)
│   ├── src/                 # Source code (App.jsx, components)
│   └── ...                  # Assets, config
├── docker-compose.yml       # Orchestrates services
├── .gitignore               # Excludes node_modules, .env, etc.
├── .env.example             # Template for environment variables
├── LICENSE                  # Project license
└── README.md                # This file

```
- **Services**:
  - **Backend**: Runs Express on port 5000, connects to PostgreSQL via \`DATABASE_URL\`.
  - **Frontend**: Builds Vite app and serves static files via Nginx on port 80 (mapped to 3000).

## Database Setup

The app requires a PostgreSQL database. Options:

### Using External Database (Recommended: Nhost or Neon)
- **Nhost**: Get the connection string from Nhost Dashboard > Settings > Database.
- **Neon**: Get the connection string from Neon Console > Connection Details.
- Update \`.env\` with DATABASE VARIABLES.


### Database Schema
The database consists of the following tables in the \`public\` schema:

#### Table: chat_members
- **Columns**:
  - \`chat_id\` (UUID): References the chat ID.
  - \`user_id\` (BIGINT): References the user ID.
  - \`joined_at\` (TIMESTAMP WITH TIME ZONE, DEFAULT 'now()'): When the user joined the chat.
  - \`role\` (SMALLINT, DEFAULT 0): User role in the chat (e.g., 0 for member, 1 for admin).
- **Constraints**:
  - \`chat_members_pkey\`: PRIMARY KEY (\`chat_id\`, \`user_id\`).
  - \`chat_members_chat_id_fkey\`: FOREIGN KEY (\`chat_id\`) REFERENCES \`public.chats(id)\` ON DELETE CASCADE.
  - \`chat_members_user_id_fkey\`: FOREIGN KEY (\`user_id\`) REFERENCES \`public.users(id)\` ON DELETE CASCADE.
- **Indexes**:
  - \`chat_members_pkey\`: UNIQUE INDEX ON (\`chat_id\`, \`user_id\`) USING BTREE.

#### Table: chats
- **Columns**:
  - \`id\` (UUID, PRIMARY KEY, DEFAULT 'gen_random_uuid()'): Unique chat ID.
  - \`is_group\` (BOOLEAN, DEFAULT false): Whether the chat is a group chat.
  - \`title\` (VARCHAR(200)): Chat title.
  - \`description\` (TEXT): Chat description.
  - \`profile_picture\` (TEXT): URL or path to chat profile picture.
  - \`created_by\` (BIGINT): User ID of the creator.
  - \`created_at\` (TIMESTAMP WITH TIME ZONE, DEFAULT 'now()'): Creation timestamp.
  - \`properties\` (JSONB, DEFAULT '{}'): Additional chat metadata.
- **Constraints**:
  - \`chats_pkey\`: PRIMARY KEY (\`id\`).
  - \`chats_created_by_fkey\`: FOREIGN KEY (\`created_by\`) REFERENCES \`public.users(id)\`.
- **Indexes**:
  - \`chats_pkey\`: UNIQUE INDEX ON (\`id\`) USING BTREE.

#### Table: message_receipts
- **Columns**:
  - \`message_id\` (UUID): References the message ID.
  - \`recipient_user_id\` (BIGINT): References the recipient user ID.
  - \`delivered_at\` (TIMESTAMP WITH TIME ZONE): When the message was delivered.
  - \`read_at\` (TIMESTAMP WITH TIME ZONE): When the message was read.
- **Constraints**:
  - \`message_receipts_pkey\`: PRIMARY KEY (\`message_id\`, \`recipient_user_id\`).
  - \`message_receipts_message_id_fkey\`: FOREIGN KEY (\`message_id\`) REFERENCES \`public.messages(id)\` ON DELETE CASCADE.
  - \`message_receipts_recipient_user_id_fkey\`: FOREIGN KEY (\`recipient_user_id\`) REFERENCES \`public.users(id)\`.
- **Indexes**:
  - \`message_receipts_pkey\`: UNIQUE INDEX ON (\`message_id\`, \`recipient_user_id\`) USING BTREE.

#### Table: messages
- **Columns**:
  - \`id\` (UUID, PRIMARY KEY, DEFAULT 'gen_random_uuid()'): Unique message ID.
  - \`chat_id\` (UUID): References the chat ID.
  - \`sender_user_id\` (BIGINT): References the sender user ID.
  - \`created_at\` (TIMESTAMP WITH TIME ZONE, DEFAULT 'now()'): Creation timestamp.
  - \`server_received_at\` (TIMESTAMP WITH TIME ZONE, DEFAULT 'now()'): Server receipt timestamp.
  - \`message_type\` (VARCHAR(50), DEFAULT 'text'): Type of message (e.g., text, image).
  - \`body\` (TEXT): Message content.
  - \`media_id\` (UUID): References media ID (if applicable).
  - \`quoted_message_id\` (UUID): References quoted message ID (if applicable).
  - \`edit_of\` (UUID): References edited message ID (if applicable).
  - \`ephemeral_expires_at\` (TIMESTAMP WITH TIME ZONE): Expiry for ephemeral messages.
  - \`seq\` (BIGINT): Message sequence number.
  - \`metadata\` (JSONB, DEFAULT '{}'): Additional message metadata.
- **Constraints**:
  - \`messages_pkey\`: PRIMARY KEY (\`id\`).
  - \`messages_chat_id_fkey\`: FOREIGN KEY (\`chat_id\`) REFERENCES \`public.chats(id)\` ON DELETE CASCADE.
  - \`messages_media_id_fkey\`: FOREIGN KEY (\`media_id\`) REFERENCES \`public.media(id)\`.
  - \`messages_sender_user_id_fkey\`: FOREIGN KEY (\`sender_user_id\`) REFERENCES \`public.users(id)\`.
- **Indexes**:
  - \`messages_pkey\`: UNIQUE INDEX ON (\`id\`) USING BTREE.

#### Table: media
- **Columns**:
  - \`id\` (UUID, PRIMARY KEY, DEFAULT 'gen_random_uuid()'): Unique media ID.
  - \`owner_user_id\` (BIGINT): References the user who uploaded the media.
  - \`content_type\` (VARCHAR(100)): Type of media (e.g., image/jpeg, video/mp4).
  - \`url\` (TEXT): URL or path to the media file.
  - \`size_bytes\` (BIGINT): Size of the media file in bytes.
  - \`width\` (INTEGER): Media width (for images/videos).
  - \`height\` (INTEGER): Media height (for images/videos).
  - \`thumb_url\` (TEXT): URL or path to thumbnail (if applicable).
  - \`created_at\` (TIMESTAMP WITH TIME ZONE, DEFAULT 'now()'): Creation timestamp.
  - \`encrypted\` (BOOLEAN, DEFAULT true): Whether the media is encrypted.
  - \`metadata\` (JSONB, DEFAULT '{}'): Additional media metadata.
- **Constraints**:
  - \`media_pkey\`: PRIMARY KEY (\`id\`).
  - \`media_owner_user_id_fkey\`: FOREIGN KEY (\`owner_user_id\`) REFERENCES \`public.users(id)\`.
- **Indexes**:
  - \`media_pkey\`: UNIQUE INDEX ON (\`id\`) USING BTREE.

#### Table: users
- **Columns**:
  - \`id\` (BIGSERIAL, PRIMARY KEY): Unique user ID.
  - \`phone_number\` (VARCHAR(30), UNIQUE, NOT NULL): User's phone number.
  - \`name\` (VARCHAR(100)): User's name.
  - \`about\` (TEXT): User's bio.
  - \`profile_picture\` (TEXT): URL or path to profile picture.
  - \`push_token\` (TEXT): Push notification token.
  - \`created_at\` (TIMESTAMP WITH TIME ZONE, DEFAULT 'now()'): Creation timestamp.
  - \`last_seen_at\` (TIMESTAMP WITH TIME ZONE): Last active timestamp.
  - \`is_active\` (BOOLEAN, DEFAULT false): Whether the user is active.
  - \`password_hash\` (VARCHAR(255)): Hashed password.
- **Constraints**:
  - \`users_pkey\`: PRIMARY KEY (\`id\`).
  - \`users_phone_number_key\`: UNIQUE (\`phone_number\`).
  - \`chk_auth_method\`: CHECK (\`password_hash\` IS NOT NULL OR \`phone_number\` IS NOT NULL).
- **Indexes**:
  - \`users_pkey\`: UNIQUE INDEX ON (\`id\`) USING BTREE.
  - \`users_phone_number_key\`: UNIQUE INDEX ON (\`phone_number\`) USING BTREE.


## Development Workflow

- **Code Changes**: Edit files in \`frontend/src\` or \`backend\`. Restart with \`docker-compose up --build\` to apply changes.
- **Local Development (Outside Docker)**:
  - Backend: \`cd backend && npm install && npm start\`.
  - Frontend: \`cd frontend && npm install && npm run dev\` (runs on port 5173).
- **Production Build**: The \`frontend/Dockerfile\` automatically builds the Vite app (\`npm run build\`) and serves via Nginx And the same with backend run \`npm run build`\.


## Configure Environment Variables (Backend Folder)

- Copy the example environment file:
- Edit `.env` with the following values, replacing placeholders with your own where necessary:
  ```
  # JWT configuration for backend authentication
  JWT_SECRET=yoursecret
  JWT_LIFETIME=yourtime

  # Backend port
  PORT=5000

  # Database connection (Neon; replace with your Nhost or local Postgres details)
  NHOST_POSTGRES_HOST=yourdbhost
  NHOST_POSTGRES_PORT=yourdbport
  NHOST_POSTGRES_DATABASE=yourdbname
  NHOST_POSTGRES_USER=yourdbuser
  NHOST_POSTGRES_PASSWORD=yourdbpassword

  # Environment mode
  NODE_ENV=development

  ```
- **Notes**:
  - Replace `JWT_SECRET` with a secure, unique key for production (generate with `openssl rand -base64 32`).
  - Use your Neon or Nhost database credentials for `NHOST_POSTGRES_*` variables.
  - For local Postgres, use `NHOST_POSTGRES_HOST=db` if using the Dockerized `db` service.
  - Set `NODE_ENV=production` for production deployments.

## Troubleshooting

- **Build Fails with Rollup Error** (\`Cannot find module '@rollup/rollup-linux-x64-gnu'\`):
  \`\`\`bash
  cd frontend
  rm -rf node_modules package-lock.json
  npm install --legacy-peer-deps
  cd ..
  docker-compose build --no-cache
  \`\`\`

- **Database Connection Error**:
  - Verify DATABASE_URL or VARIABLES in \`.env\`.
  - For local Postgres, ensure the \`db\` service is uncommented in \`docker-compose.yml\`.

- **Port Conflicts**:
  - Change ports in \`docker-compose.yml\` (e.g., \`3001:80\` for frontend).

- **Logs**:
  ```bash
  docker-compose logs backend  # Backend-specific
  docker-compose logs frontend # Frontend-specific
  ```

- **Clean Up**:
  ```bash
  docker-compose down --volumes --remove-orphans
  docker system prune -f  # Remove unused images
  ```

## Contributing

1. Fork the repository.
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`).
3. Commit changes (\`git commit -m 'Add some amazing feature'\`).
4. Push to the branch (\`git push origin feature/amazing-feature\`).
5. Open a Pull Request.

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

---