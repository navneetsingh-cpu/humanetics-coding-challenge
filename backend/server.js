// Import core modules
const express = require('express'); // Web server framework
const http = require('http');       // HTTP server (needed for Socket.IO)
const socketIo = require('socket.io'); // WebSocket library for real-time communication
const cors = require('cors');       // Middleware to enable CORS

const PORT = 3000;                  // Port on which server will listen
const app = express();             // Create Express app
app.use(cors({ origin: 'http://localhost:4200' })); // Enable CORS for Angular frontend


const server = http.createServer(app); // Create raw HTTP server
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:4200', // Allow Angular client to connect via WebSocket
        methods: ['GET', 'POST']
    }
});


const SENSOR_COUNT = 100;          // Simulate 100 sensors per ATD
const SAMPLE_INTERVAL_MS = 100;    // Each sensor sends data every 100ms (10 Hz)
const BATCH_INTERVAL_MS = 500;     // We send data to clients in batches every 500ms


// Function to simulate a snapshot of all sensors
function generateSensorData() {
    const sensors = {};
    for (let i = 0; i < SENSOR_COUNT; i++) {
        sensors[`sensor_${i}`] = Math.random() * 100; // Generate random sensor value
    }
    return { timestamp: Date.now(), sensors };
    //Returns a structure like:

    // {
    //     timestamp: 1711380200000,
    //     sensors: {
    //       sensor_0: 42.1,
    //       sensor_1: 87.2,
    //       ...
    //     }
    //   }
}


let dataBuffer = []; // Accumulates data points for batching

// Simulate real-time data arrival every 100ms
setInterval(() => {
    const dataPoint = generateSensorData(); // Create new snapshot
    dataBuffer.push(dataPoint);             // Add to buffer
}, SAMPLE_INTERVAL_MS);


// Send batched data to all connected clients every 500ms
setInterval(() => {
    if (dataBuffer.length > 0) {
        io.emit('sensor-data-batch', dataBuffer); // Emit to all clients
        console.log(`Sent batch of ${dataBuffer.length} data points`);
        dataBuffer = []; // Clear the buffer after sending
    }
}, BATCH_INTERVAL_MS);


// Handle client connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});


server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
