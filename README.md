# BoardBullets Backend API

A comprehensive Node.js backend API for the BoardBullets quiz platform, built with Express.js and MongoDB. This application provides a robust quiz management system with multi-language support, user authentication, analytics, and payment integration.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Database Models](#database-models)
- [Authentication](#authentication)
- [Multi-Language Support](#multi-language-support)
- [Payment Integration](#payment-integration)
- [Analytics](#analytics)
- [File Upload](#file-upload)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Contributing](#contributing)

## Overview

BoardBullets is a medical education quiz platform designed to help students prepare for medical board examinations. The backend provides comprehensive APIs for user management, quiz operations, performance analytics, and administrative functions with support for multiple languages and educational levels.

## Features

### Core Features
- **User Authentication & Authorization** - JWT-based authentication with role-based access control
- **Multi-Language Quiz System** - Support for English, Spanish, French, Urdu, and Arabic
- **Question Management** - Excel import/export, bulk operations, approval workflows
- **Performance Analytics** - Detailed user performance tracking and reporting
- **Payment Integration** - Stripe integration for subscription management
- **Admin Dashboard** - Comprehensive admin tools for user and content management
- **File Upload** - Cloudinary integration for image/document uploads
- **Email Services** - Automated email notifications and verification

### Advanced Features
- **Real-time Active User Tracking** - Monitor currently active users
- **Session Management** - Secure session handling with automatic logout detection
- **University Database** - Comprehensive university listings with search capabilities
- **Educational Status Tracking** - Support for various educational levels and specialties
- **Revenue Analytics** - Detailed subscription and revenue tracking
- **CORS Configuration** - Secure cross-origin resource sharing
- **Request Compression** - Optimized response compression
- **Error Handling** - Comprehensive error handling with detailed logging

## Technology Stack

### Backend Framework
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM

### Authentication & Security
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcryptjs** - Password hashing
- **cookie-parser** - Cookie handling
- **express-validator** - Input validation

### External Services
- **Stripe** - Payment processing
- **Cloudinary** - Image and file storage
- **Nodemailer** - Email service
- **Google Generative AI** - AI integration

### Utilities
- **compression** - Response compression
- **cors** - Cross-origin resource sharing
- **multer** - File upload handling
- **papaparse** - CSV parsing
- **xlsx** - Excel file processing
- **uuid** - Unique identifier generation

## Project Structure

```
B4AI-Node/
├── controllers/          # Request handlers
│   ├── analytics.controller.js
│   ├── questions-controller.js
│   ├── quiz-controller.js
│   ├── revenue.controller.js
│   ├── user.controller.js
│   └── ...
├── models/              # Database schemas
│   ├── userModel.js
│   ├── QuestionsModel.js
│   ├── PerformanceAnalytics.js
│   ├── quizModel.js
│   └── ...
├── routes/              # API route definitions
│   ├── user.route.js
│   ├── quiz.route.js
│   ├── questions.route.js
│   ├── analytics.route.js
│   └── ...
├── middleware/          # Custom middleware
│   └── multer.js
├── utils/               # Utility functions
│   ├── db.js
│   ├── emailService.js
│   ├── cloudinary.js
│   └── datauri.js
├── services/            # Business logic services
├── methods/             # Helper methods
├── configs/             # Configuration files
├── index.js             # Main application entry point
├── insertData.js        # Data insertion utilities
├── insertQuestions.js   # Question insertion utilities
├── populateDB.js        # Database population script
├── universities.csv     # University data
└── .env                 # Environment variables
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Cloudinary account for file storage
- Stripe account for payment processing
- Email service credentials (Gmail recommended)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd B4AI-Node
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=9003
   HOST=127.0.0.1
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   JWT_SECRET=your_jwt_secret
   ACCESS_SECRET=your_access_secret
   SESSION_TTL_DAYS=7
   ACCESS_TOKEN_EXPIRES_IN=15m
   VERIFY_USER_ON_REQUEST=false

   # Email Configuration
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   EMAIL_FROM=your_email@gmail.com
   EMAIL_SERVER=smtp.gmail.com
   EMAIL_PORT=587

   # Cloudinary Configuration
   CLOUD_NAME=your_cloud_name
   API_KEY=your_api_key
   API_SECRET_KEY=your_api_secret

   # Stripe Configuration
   STRIPE_TEST_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Populate initial data** (optional)
   ```bash
   node populateDB.js
   ```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | No (default: 9003) |
| `HOST` | Server host address | No (default: 127.0.0.1) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `ACCESS_SECRET` | Access token secret | Yes |
| `EMAIL_USER` | Email service username | Yes |
| `EMAIL_PASSWORD` | Email service password | Yes |
| `CLOUD_NAME` | Cloudinary cloud name | Yes |
| `API_KEY` | Cloudinary API key | Yes |
| `API_SECRET_KEY` | Cloudinary API secret | Yes |
| `STRIPE_TEST_KEY` | Stripe secret key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |

### CORS Configuration

The application is configured to allow requests from specific domains:
- `https://208.109.35.167`
- `https://app.lekh.io`
- `http://app.lekh.io`
- `https://api.lekh.io`

## API Documentation

The API is organized into several main modules:

### Base URL
```
http://localhost:9003/api/v1
```

### Main Endpoints

#### Authentication (`/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /verify-email` - Email verification
- `GET /profile/:userId` - Get user profile
- `PUT /update-profile` - Update user profile
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset confirmation

#### Quiz Management (`/quiz`)
- `GET /categories` - Get quiz categories (supports `?language=spanish`)
- `GET /questions` - Get quiz questions (supports `?language=french&category=Biology`)
- `GET /languages` - Get available languages
- `GET /subcategories/:category` - Get subcategories
- `POST /add-question` - Add new question
- `GET /manage-quizzes` - Admin quiz management

#### Questions (`/questions`)
- `POST /import-excel` - Import questions from Excel (Admin)
- `GET /all` - Get all questions with filters
- `GET /random` - Get random questions for quiz
- `POST /create` - Create single question (Admin)
- `PUT /update/:questionId` - Update question (Admin)
- `DELETE /delete/:questionId` - Delete question (Admin)
- `GET /stats` - Get question statistics

#### Analytics (`/analytics`)
- `POST /update-analytics` - Update user analytics
- `GET /user-stats` - Get user performance statistics
- `GET /overview` - Get complete analytics overview
- `GET /leaderboard` - Get leaderboard data

#### Admin (`/admin`)
- `GET /active-users` - Get currently active users
- `GET /active-users/stats` - Get active user statistics

#### Payment (`/stripe`)
- `POST /webhook` - Stripe webhook handler
- Various subscription management endpoints

### Language Support Examples
```bash
# Get categories in Spanish
GET /api/v1/quiz/categories?language=spanish

# Get Biology questions in French
GET /api/v1/quiz/questions?language=french&category=Biology&difficulty=medium

# Get subcategories in Urdu
GET /api/v1/quiz/subcategories/Biology?language=urdu
```

## Database Models

### User Model
- Personal information and profile
- Authentication credentials
- Subscription details
- Performance tracking
- Role-based permissions

### Questions Model
- Multi-language question content
- Answer options and correct answers
- Category and subcategory classification
- Approval workflow
- Import metadata

### Performance Analytics Model
- Detailed quiz performance tracking
- Time-based analytics
- Category-wise performance
- Language-specific metrics

### University Model
- Comprehensive university database
- Country-based organization
- Medical program indicators

## Authentication

The application uses JWT-based authentication with the following features:

### Token Types
- **Access Token** - Short-lived (15 minutes) for API access
- **Refresh Token** - Long-lived (7 days) stored in HTTP-only cookies

### User Roles
- `admin` - Full system access
- `high_school` - Basic access
- `medical_student` - Enhanced features
- `practicing_physician` - Professional features
- Various other educational levels

### Authentication Flow
1. User registers with email verification
2. Login generates access and refresh tokens
3. Access token used for API authentication
4. Automatic token refresh using refresh token
5. Secure logout clears all tokens

## Multi-Language Support

The platform supports five languages:

### Supported Languages
- **English** (default)
- **Spanish**
- **French**

### Language Features
- Language-specific question filtering
- Category and subcategory translations
- Performance analytics by language
- Question import with language specification

### Usage
Add the `language` query parameter to any quiz-related endpoint:
```bash
GET /api/v1/quiz/categories?language=spanish
```

## Payment Integration

### Stripe Integration
- Subscription management (monthly/quarterly)
- Secure payment processing
- Webhook handling for payment events
- Automatic subscription renewal
- Cancellation and refund handling

### Subscription Features
- Multiple plan types
- Automatic renewal
- Payment history tracking
- Usage-based access control
- Free tier limitations

## Analytics

### User Analytics
- Quiz performance tracking
- Time-based progress monitoring
- Category-wise performance analysis
- Leaderboard rankings
- BB Points system

### Admin Analytics
- User engagement metrics
- Revenue tracking
- Question usage statistics
- Active user monitoring
- Performance trends

## File Upload

### Cloudinary Integration
- Secure file upload handling
- Image optimization
- Profile picture management
- Document storage
- Excel file processing for question import

### Supported Operations
- Profile picture uploads
- Excel question imports
- Document attachments
- Image compression and optimization

## Development

### Development Scripts
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Populate database with sample data
node populateDB.js

# Insert questions from Excel
node insertQuestions.js

# General data insertion
node insertData.js
```

### Development Tools
- **Nodemon** - Auto-restart on file changes
- **Express** - Fast, unopinionated web framework
- **Mongoose** - MongoDB object modeling
- **Compression** - Response compression middleware

### Code Organization
- **Controllers** - Handle HTTP requests and responses
- **Models** - Define database schemas and business logic
- **Routes** - Define API endpoints and middleware
- **Services** - Contain business logic and external API calls
- **Utils** - Utility functions and helpers
- **Middleware** - Custom middleware for authentication, validation, etc.

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production MongoDB cluster
3. Set up production Cloudinary environment
4. Configure production Stripe keys
5. Set up production email service

### Performance Optimizations
- Response compression enabled
- Database indexing for optimal queries
- Connection pooling
- Error logging and monitoring
- Rate limiting (recommended to add)

### Security Considerations
- JWT secret rotation
- HTTPS enforcement
- CORS policy configuration
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database connectivity tested
- [ ] External services (Stripe, Cloudinary, Email) configured
- [ ] CORS origins updated for production domains
- [ ] SSL certificates installed
- [ ] Error monitoring setup
- [ ] Backup strategy implemented
- [ ] Performance monitoring configured

## Contributing

### Development Guidelines
1. Follow the existing code structure and naming conventions
2. Write comprehensive tests for new features
3. Update documentation for API changes
4. Use meaningful commit messages
5. Follow the established error handling patterns

### Code Style
- Use ES6+ features and modules
- Follow async/await patterns
- Implement proper error handling
- Add JSDoc comments for complex functions
- Use meaningful variable and function names

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Update documentation
5. Submit a pull request with detailed description

### Testing
- Write unit tests for new features
- Test API endpoints thoroughly
- Verify multi-language functionality
- Test payment integration carefully
- Ensure proper error handling

---

## API Health Check

The application provides several health check endpoints:

- `GET /` - Basic server information and API documentation
- `GET /health` - Detailed health status including database connectivity
- `GET /api` - Complete API documentation

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.