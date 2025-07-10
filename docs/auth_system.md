# AirAlert Authentication & Authorization System Documentation

This document outlines the authentication and authorization system implemented for the AirAlert application.

## Overview

The AirAlert auth system provides secure user authentication, role-based access control, and account management features. It's built using JWT (JSON Web Tokens) for stateless authentication, bcrypt for secure password hashing, and integrates with the application's notification system.

## Key Features

- **User Registration & Email Verification**
- **Login with JWT Token Generation**
- **Token Refresh Mechanism**
- **Password Reset Flow**
- **Role-Based Access Control (RBAC)**
- **Account Lockout Protection**
- **Admin User Management Interface**

## Backend Components

### Authentication Utilities (`/backend/api/auth/utils.py`)

- **Password Security**: bcrypt hashing with salt
- **JWT Functions**: token generation, validation, refresh
- **Security Helpers**: verification token generation, user role validation
- **Middleware**: auth user extraction, admin/superuser validation

### Authentication Routes (`/backend/api/auth/routes.py`)

- **POST /api/auth/register**: User registration with validation
- **POST /api/auth/login**: Authentication with JWT generation
- **GET /api/auth/verify-email/{token}**: Email verification
- **POST /api/auth/reset-password-request**: Password reset flow initiation
- **POST /api/auth/reset-password/{token}**: Password reset completion
- **GET /api/auth/me**: Get authenticated user profile
- **POST /api/auth/logout**: Token revocation
- **POST /api/auth/refresh-token**: JWT token refresh

### Authentication Models (`/backend/api/auth/models.py`)

- **TokenData**: Structure for JWT payload
- **UserCreate**: Registration data with validation
- **UserResponse**: User profile response model
- **PasswordReset**: Password reset validation

### Admin Routes (`/backend/api/admin/routes.py`)

- **GET /api/admin/users**: List users with filtering
- **GET /api/admin/users/{user_id}**: Get user details
- **PUT /api/admin/users/{user_id}/role**: Update user role
- **PUT /api/admin/users/{user_id}/status**: Activate/deactivate users
- **GET /api/admin/users/stats**: User statistics

## Frontend Components

### Authentication Services (`/frontend/src/services/auth.js`)

- **API Integration**: Auth API client with error handling
- **Token Management**: Secure token storage/refresh
- **User State Handling**: User profile management

### Authentication Context (`/frontend/src/context/AuthContext.js`)

- **Global Auth State**: React Context for auth state
- **Auth Actions**: login, logout, registration, etc.
- **Role Helpers**: Permission checking utilities

### Protected Routes (`/frontend/src/components/auth/ProtectedRoute.js`)

- **Route Protection**: Authentication requirement for pages
- **Role Protection**: Role-based component rendering

### Authentication UI Components

- **Login Page**: User authentication interface
- **Registration Page**: New user signup with validation
- **Email Verification**: Account verification flow
- **Password Reset**: Password recovery process
- **User Management**: Admin interface for user control

## Security Features

### Password Security

- **Strong Password Policy**: 8+ chars with uppercase, lowercase, number, special char
- **Secure Storage**: bcrypt hashing with automatic salting
- **Account Lockout**: 5 failed attempts locks account for 15 minutes

### API Security

- **Rate Limiting**: Prevents brute-force attacks
- **CSRF Protection**: Token validation
- **Input Validation**: Pydantic model validation

### Token Security

- **Short-Lived Access**: 30-minute token expiry
- **Token Refresh**: Sliding session with refresh tokens
- **Token Revocation**: Blacklist support

## Authentication Flow

1. **Registration**:

   - User submits registration form
   - Backend validates and creates account
   - Verification email sent to user
   - User clicks verification link

2. **Login**:

   - User submits credentials
   - Backend validates and generates JWT
   - Frontend stores token securely
   - User accesses protected resources

3. **Session Management**:
   - Frontend checks token expiration
   - Automatic token refresh when needed
   - Manual logout invalidates tokens

## Role-Based Access Control

The system supports three user roles:

1. **User** (default):

   - Access to personal dashboard and alerts
   - Profile management
   - Alert subscription management

2. **Admin**:

   - All user permissions
   - Access to admin dashboard
   - User management (except superusers)
   - System monitoring tools

3. **Superuser**:
   - All admin permissions
   - Can manage other admins
   - Full system access
   - Configuration management

## Best Practices Implemented

- **Stateless Authentication**: JWT-based auth without server sessions
- **Proper Error Handling**: Secure error responses
- **Password Hashing**: Industry-standard bcrypt algorithm
- **Email Verification**: Required before full account access
- **Token Validation**: Complete token lifecycle management
- **RBAC Implementation**: Granular permission control
- **Input Sanitization**: Validation before processing
- **Rate Limiting**: Protection against abuse

## Troubleshooting

- **Login Issues**: Check credential correctness, account status
- **Token Errors**: Verify token validity, refresh token status
- **Permission Problems**: Ensure user has required role
- **Email Verification**: Check email delivery, token expiration

## Future Enhancements

- **OAuth Integration**: Support for third-party authentication
- **2FA Support**: Two-factor authentication option
- **Permission Groups**: More granular access control
- **Audit Logging**: Track authentication events
- **Redis Backend**: For token blacklist management
