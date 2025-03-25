const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const PORT = 3000;
const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));

const server = http.createServer(app);
// Configure Socket.IO to use CORS
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:4200',
        methods: ['GET', 'POST']
    }
});

const SENSOR_COUNT = 100;
const SAMPLE_INTERVAL_MS = 100;
const BATCH_INTERVAL_MS = 500; // Send data every 500ms

// Simulated ATD sensor data generator
function generateSensorData() {
    const sensors = {};
    for (let i = 0; i < SENSOR_COUNT; i++) {
        sensors[`sensor_${i}`] = Math.random() * 100; // Example value
    }
    return { timestamp: Date.now(), sensors };
}

// Store sensor data temporarily for batching
let dataBuffer = [];

// Simulate incoming data from ATD
setInterval(() => {
    const dataPoint = generateSensorData();
    dataBuffer.push(dataPoint);
}, SAMPLE_INTERVAL_MS);

// Batch send buffered data every BATCH_INTERVAL_MS
setInterval(() => {
    if (dataBuffer.length > 0) {
        io.emit('sensor-data-batch', dataBuffer);
        console.log(`Sent batch of ${dataBuffer.length} data points`);
        dataBuffer = []; // clear after sending
    }
}, BATCH_INTERVAL_MS);

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
