# Hotel Management System

A simple full-stack hotel management system built with Node.js, Express, SQLite, and vanilla HTML/CSS/JavaScript.

## Features

### Backend (Node.js + Express + SQLite)
- **User Authentication**: Secure login with hashed passwords
- **Room Booking API**: Create bookings with date validation and conflict prevention
- **Availability Check**: Check room availability for specific dates
- **Booking Management**: View all bookings and cancel existing ones
- **Database**: SQLite with Users, Rooms, and Bookings tables

### Frontend (HTML/CSS/JavaScript)
- **Login Page**: Clean authentication interface
- **Dashboard**: Comprehensive booking management interface
- **Room Booking Form**: Guest name, room selection, date inputs with validation
- **Availability Checker**: Real-time room availability status
- **Booking List**: Table view of all current bookings with cancel functionality
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Start the Server
\`\`\`bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
\`\`\`

### 3. Access the Application
- Open your browser and go to `http://localhost:3000`
- Use the demo credentials:
  - Username: `admin`
  - Password: `password`

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/verify` - Verify session

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get all bookings
- `DELETE /api/bookings/:id` - Cancel booking

### Rooms
- `GET /api/rooms` - Get all available rooms
- `POST /api/check-availability` - Check room availability

## Database Schema

### Users Table
- `id` (INTEGER PRIMARY KEY)
- `username` (TEXT UNIQUE)
- `password_hash` (TEXT)

### Rooms Table
- `id` (INTEGER PRIMARY KEY)
- `room_number` (TEXT UNIQUE)

### Bookings Table
- `id` (INTEGER PRIMARY KEY)
- `guest_name` (TEXT)
- `room_number` (TEXT)
- `check_in` (DATE)
- `check_out` (DATE)
- `created_at` (DATETIME)

## Features

### Date Validation
- Check-out date must be after check-in date
- No bookings allowed for past dates
- Prevents double booking of rooms for overlapping dates

### Room Management
- Pre-populated with rooms 101-103, 201-203, 301-303
- Easy to add more rooms via database

### Security
- Passwords are hashed using bcryptjs
- Input validation on all endpoints
- CORS enabled for frontend integration

## Technology Stack
- **Backend**: Node.js, Express.js, SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Security**: bcryptjs for password hashing
- **Database**: SQLite (file-based, no setup required)
