# Jago Backend

Jago Backend is a NestJS-based API for wallet operations, bill vending, user authentication (JWT), KYC, and event-driven processing using mocked SQS and notification services. The app demonstrates secure user management, wallet funding, bill payments with reversal logic, and notification delivery.

## Features

- JWT-based authentication and authorization
- User signup, signin, and registration with shortcode
- KYC operations
- Wallet funding and balance management
- Bill vending API with event-driven SQS mock and reversal on failure
- Notification system with endpoint to view notifications
- Swagger API documentation

## Tech Stack

- Node.js (TypeScript)
- NestJS
- TypeORM (SQLite)
- Mocked SQS and notification services

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/John-Akins/jago-backend.git
cd jago-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the project root with the following content:

```
PORT=3000
JWT_SECRET=superSecretKey
```

### 4. Run Database Migrations (if needed)

SQLite is used by default. The database will be created automatically.

### 5. Start the Application

```bash
npm run start
```

The API will be available at `http://localhost:3000`.

## Testing with Swagger

Swagger UI is available at:  
`http://localhost:3000/api`

### Step-by-Step Testing

#### 1. Sign Up

- Use the `/auth/signup` endpoint to create a new user.
- Provide required fields (email, password, etc.).

#### 2. Sign In

- Use the `/auth/signin` endpoint to log in.
- Copy the JWT token from the response.

#### 3. Authorize Session

- Click the "Authorize" button (lock icon) in Swagger UI.
- Paste your JWT token as:  
  ```
  Bearer <your-token>
  ```
- Click "Authorize" to enable authenticated requests.

#### 4. Test Endpoints

- **User:** `/user/email/{email}` to fetch user details (requires JWT).
- **Wallet:** `/wallet/fund` to fund wallet, `/wallet/pay-bill` to pay bills.
- **KYC:** `/kyc` endpoints for KYC operations.
- **Notifications:** `/notifications` to view notifications (most recent first).
- **Bill Vending:** `/wallet/pay-bill` triggers event-driven bill payment. Use amount `9999` to simulate failure and reversal.

#### 5. Event-Driven Bill Payment

- Bill payments are processed via mocked SQS. The worker handles success/failure and sends notifications.
- Check `/notifications` endpoint for updates.

## Notes

- All endpoints requiring authentication need the JWT token in the `Authorization` header.
- Notifications are persisted and can be viewed via the `/notifications` endpoint.
- Bill payment reversals are triggered automatically on failure (amount `9999`).

## License

MIT