const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcryptjs")
const cors = require("cors")
const bodyParser = require("body-parser")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(express.static("public"))

// Database setup
const db = new sqlite3.Database("./hotel_management.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message)
  } else {
    console.log("Connected to SQLite database")
    initializeDatabase()
  }
})

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT UNIQUE NOT NULL,
    room_type TEXT DEFAULT 'Non-AC'
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    checkout_date DATE DEFAULT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Insert demo user and rooms
  const hashedPassword = bcrypt.hashSync("password", 10)
  db.run(`INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)`, ["admin", hashedPassword])

  const rooms = [
    { number: "101", type: "AC" },
    { number: "102", type: "Non-AC" },
    { number: "103", type: "Non-AC" },
    { number: "201", type: "AC" },
    { number: "202", type: "Non-AC" },
    { number: "203", type: "Non-AC" },
    { number: "301", type: "AC" },
    { number: "302", type: "Non-AC" },
    { number: "303", type: "Non-AC" },
    { number: "104", type: "AC" },
    { number: "105", type: "Non-AC" },
    { number: "204", type: "AC" },
    { number: "205", type: "Non-AC" },
    { number: "304", type: "AC" },
    { number: "305", type: "Non-AC" },
  ]

  rooms.forEach((room) => {
    db.run(`INSERT OR IGNORE INTO rooms (room_number, room_type) VALUES (?, ?)`, [room.number, room.type])
  })
}

// Helper function to check date overlaps
function datesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1
}

// Helper function to validate dates
function validateDates(checkIn, checkOut) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (checkInDate < today) {
    return "Check-in date cannot be in the past"
  }

  if (checkOutDate <= checkInDate) {
    return "Check-out date must be after check-in date"
  }

  return null
}

// Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    res.json({
      success: true,
      message: "Login successful",
      user: { id: user.id, username: user.username },
    })
  })
})

// User registration endpoint
app.post("/api/register", (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  db.get("SELECT id FROM users WHERE username = ?", [username], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }
    if (existing) {
      return res.status(400).json({ error: "Username already exists" })
    }

    const hash = bcrypt.hashSync(password, 10)
    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash], function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to create user" })
      }
      return res.json({
        success: true,
        message: "Registration successful",
        user: { id: this.lastID, username },
      })
    })
  })
})

// Verify token endpoint (simple session check)
app.get("/api/verify", (req, res) => {
  // For simplicity, we'll just return success
  // In a real app, you'd verify JWT tokens here
  res.json({ success: true, message: "Session valid" })
})

// Create a new booking
app.post("/api/bookings", (req, res) => {
  const { guestName, roomNumber, checkIn, checkOut } = req.body

  if (!guestName || !roomNumber || !checkIn || !checkOut) {
    return res.status(400).json({ error: "All fields are required" })
  }

  // Validate dates
  const dateError = validateDates(checkIn, checkOut)
  if (dateError) {
    return res.status(400).json({ error: dateError })
  }

  // Check if room exists
  db.get("SELECT * FROM rooms WHERE room_number = ?", [roomNumber], (err, room) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }

    if (!room) {
      return res.status(400).json({ error: "Room does not exist" })
    }

    // Check for overlapping bookings
    db.all(
      `SELECT * FROM bookings WHERE room_number = ? AND 
       ((check_in < ? AND check_out > ?) OR 
        (check_in < ? AND check_out > ?) OR 
        (check_in >= ? AND check_out <= ?))`,
      [roomNumber, checkOut, checkIn, checkOut, checkOut, checkIn, checkOut],
      (err, overlappingBookings) => {
        if (err) {
          return res.status(500).json({ error: "Database error" })
        }

        if (overlappingBookings.length > 0) {
          return res.status(400).json({ error: "Room is not available for the selected dates" })
        }

        // Create the booking
        db.run(
          "INSERT INTO bookings (guest_name, room_number, check_in, check_out) VALUES (?, ?, ?, ?)",
          [guestName, roomNumber, checkIn, checkOut],
          function (err) {
            if (err) {
              return res.status(500).json({ error: "Failed to create booking" })
            }

            res.json({
              success: true,
              message: "Booking created successfully",
              booking: {
                id: this.lastID,
                guestName,
                roomNumber,
                checkIn,
                checkOut,
              },
            })
          },
        )
      },
    )
  })
})

// Get all bookings
app.get("/api/bookings", (req, res) => {
  db.all(
    `
    SELECT b.*, r.room_type 
    FROM bookings b 
    JOIN rooms r ON b.room_number = r.room_number 
    WHERE b.status = 'active'
    ORDER BY b.created_at DESC
  `,
    (err, bookings) => {
      if (err) {
        return res.status(500).json({ error: "Database error" })
      }

      res.json({ success: true, bookings })
    },
  )
})

// Cancel a booking
app.delete("/api/bookings/:id", (req, res) => {
  const bookingId = req.params.id

  db.run("DELETE FROM bookings WHERE id = ?", [bookingId], function (err) {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Booking not found" })
    }

    res.json({ success: true, message: "Booking cancelled successfully" })
  })
})

// Check room availability
app.post("/api/check-availability", (req, res) => {
  const { roomNumber, checkIn, checkOut } = req.body

  if (!roomNumber) {
    return res.status(400).json({ error: "Room number is required" })
  }

  // If dates are provided, check for specific period
  if (checkIn && checkOut) {
    const dateError = validateDates(checkIn, checkOut)
    if (dateError) {
      return res.status(400).json({ error: dateError })
    }

    db.all(
      `SELECT * FROM bookings WHERE room_number = ? AND 
       ((check_in < ? AND check_out > ?) OR 
        (check_in < ? AND check_out > ?) OR 
        (check_in >= ? AND check_out <= ?))`,
      [roomNumber, checkOut, checkIn, checkOut, checkOut, checkIn, checkOut],
      (err, overlappingBookings) => {
        if (err) {
          return res.status(500).json({ error: "Database error" })
        }

        res.json({
          success: true,
          available: overlappingBookings.length === 0,
          roomNumber,
          period: { checkIn, checkOut },
          conflictingBookings: overlappingBookings,
        })
      },
    )
  } else {
    // Check current availability (no active bookings for today)
    const today = new Date().toISOString().split("T")[0]

    db.all(
      "SELECT * FROM bookings WHERE room_number = ? AND check_in <= ? AND check_out > ?",
      [roomNumber, today, today],
      (err, currentBookings) => {
        if (err) {
          return res.status(500).json({ error: "Database error" })
        }

        res.json({
          success: true,
          available: currentBookings.length === 0,
          roomNumber,
          currentBookings,
        })
      },
    )
  }
})

// Get all available rooms
app.get("/api/rooms", (req, res) => {
  db.all("SELECT * FROM rooms ORDER BY room_number", (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }

    res.json({ success: true, rooms })
  })
})

app.get("/api/rooms/by-type/:type", (req, res) => {
  const roomType = req.params.type

  db.all("SELECT * FROM rooms WHERE room_type = ? ORDER BY room_number", [roomType], (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: "Database error" })
    }

    res.json({ success: true, rooms, roomType })
  })
})

// Manual vacate endpoint - allows staff to vacate room before booking period ends
app.post("/api/bookings/:id/manual-vacate", (req, res) => {
  const bookingId = req.params.id
  const vacateDate = new Date().toISOString().split("T")[0] // Today's date

  db.run(
    "UPDATE bookings SET checkout_date = ?, status = 'manually-vacated' WHERE id = ? AND status = 'active'",
    [vacateDate, bookingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database error" })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Active booking not found" })
      }

      res.json({
        success: true,
        message: "Room manually vacated successfully",
        vacateDate,
      })
    },
  )
})

// Room management endpoints for adding/removing rooms
app.post("/api/rooms", (req, res) => {
  const { roomNumber, roomType } = req.body

  if (!roomNumber || !roomType) {
    return res.status(400).json({ error: "Room number and room type are required" })
  }

  db.run("INSERT INTO rooms (room_number, room_type) VALUES (?, ?)", [roomNumber, roomType], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Room number already exists" })
      }
      return res.status(500).json({ error: "Database error" })
    }

    res.json({
      success: true,
      message: "Room added successfully",
      room: {
        id: this.lastID,
        roomNumber,
        roomType,
      },
    })
  })
})

// Endpoint to remove/disable a room
app.delete("/api/rooms/:roomNumber", (req, res) => {
  const roomNumber = req.params.roomNumber

  // First check if room has active bookings
  db.get(
    "SELECT COUNT(*) as count FROM bookings WHERE room_number = ? AND status = 'active'",
    [roomNumber],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error" })
      }

      if (result.count > 0) {
        return res.status(400).json({
          error: "Cannot remove room with active bookings. Please vacate all guests first.",
        })
      }

      // Remove the room
      db.run("DELETE FROM rooms WHERE room_number = ?", [roomNumber], function (err) {
        if (err) {
          return res.status(500).json({ error: "Database error" })
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Room not found" })
        }

        res.json({
          success: true,
          message: "Room removed successfully",
        })
      })
    },
  )
})

// Endpoint to get room status with current occupancy
app.get("/api/rooms/status", (req, res) => {
  const today = new Date().toISOString().split("T")[0]

  db.all(
    `
    SELECT 
      r.room_number,
      r.room_type,
      CASE 
        WHEN b.id IS NOT NULL THEN 'occupied'
        ELSE 'available'
      END as status,
      b.guest_name,
      b.check_in,
      b.check_out
    FROM rooms r
    LEFT JOIN bookings b ON r.room_number = b.room_number 
      AND b.status = 'active' 
      AND b.check_in <= ? 
      AND b.check_out > ?
    ORDER BY r.room_number
  `,
    [today, today],
    (err, rooms) => {
      if (err) {
        return res.status(500).json({ error: "Database error" })
      }

      res.json({ success: true, rooms })
    },
  )
})

// Checkout a booking
app.post("/api/bookings/:id/checkout", (req, res) => {
  const bookingId = req.params.id
  const checkoutDate = new Date().toISOString().split("T")[0] // Today's date

  db.run(
    "UPDATE bookings SET checkout_date = ?, status = 'checked-out' WHERE id = ? AND status = 'active'",
    [checkoutDate, bookingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Database error" })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Active booking not found" })
      }

      res.json({
        success: true,
        message: "Guest checked out successfully",
        checkoutDate,
      })
    },
  )
})

// Routes will be added in next step
app.get("/", (req, res) => {
  res.json({ message: "Hotel Management API Server" })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
