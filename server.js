const express = require('express');
const app = express();
const http = require('http').createServer(app);
const socket = io("http://127.0.0.1:3000");

app.use(express.static('public'));

// Simulate a sensor trigger every few seconds for testing
// In a real system, your hardware would send a POST request here
setInterval(() => {
    const movementDetected = Math.random() > 0.8; // 20% chance of trigger
    if (movementDetected) {
        io.emit('alarm-trigger', { message: 'Movement Detected!', timestamp: new Date() });
    }
}, 3000);

http.listen(3000, () => {
    console.log('Security System running on http://localhost:3000');
});