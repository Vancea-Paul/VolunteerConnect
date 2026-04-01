# VolunteerConnect

Starter full-stack setup with a React frontend and Spring Boot backend. The current scope is a basic login flow only.

## Requirements
- Node.js 20.19+ or 22.12+
- Java 17
- Maven 3.9+
- MySQL (for backend datasource)

## Frontend
From the frontend folder:

```bash
npm install
npm run dev
```

The frontend calls the backend at port 8080 by default. You can override the API base URL by creating a frontend .env file with:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Backend
The backend defaults to the `local` profile (no database). From the backend folder:

```bash
mvn spring-boot:run
```

To use MySQL, update the placeholders in backend/src/main/resources/application-mysql.yml and run:

```bash
$env:SPRING_PROFILES_ACTIVE="mysql"; mvn spring-boot:run
```

## Login Endpoint
- POST /api/auth/login
- Body: { "username": "...", "password": "..." }
- Response: { "token": "..." }
