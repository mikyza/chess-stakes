// DELETE any other 'const socket' lines. Use only this:
// Remove ALL other socket variables and use this
// This configuration is specific for bypassing ngrok's polling issues
const socket = io("https://linwood-feudalistic-lorenzo.ngrok-free.dev", {
    transports: ["websocket"], // Force websocket only to stop 404s
    upgrade: false,
    extraHeaders: {
        "ngrok-skip-browser-warning": "true" // This tries to bypass that blue screen
    }
});

socket.on('connect', () => {
    console.log("✅ SUCCESS! Connected to Lenovo G50 MariaDB");
});

socket.on('connect_error', (err) => {
    console.log("❌ Connection failed. Did you click 'Visit Site' on the ngrok tab?", err.message);
});
var board = null;
var game = new Chess();
let currentRoom = null;
let myColor = 'w';

// 2. CHESS BOARD LOGIC
function onDragStart (source, piece, position, orientation) {
    // Only pick up pieces if the game isn't over and it's YOUR turn/color
    if (game.game_over()) return false;
    
    // Check if it's the right turn AND if the piece matches your assigned color
    if ((game.turn() === 'w' && (myColor !== 'w' || piece.search(/^b/) !== -1)) ||
        (game.turn() === 'b' && (myColor !== 'b' || piece.search(/^w/) !== -1))) {
        return false;
    }
}

function onDrop (source, target) {
    // Local move validation
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';

    // EMIT MOVE TO SERVER: Tell the opponent what you did
    socket.emit('make-move', {
        room: currentRoom,
        move: move
    });

    updateStatus();
}

function onSnapEnd () {
    board.position(game.fen());
}

function updateStatus () {
    if (game.in_checkmate()) {
        alert("Checkmate! You win the stake!");
    } else if (game.in_draw()) {
        alert("Draw! Stake refunded.");
    }
}

$(document).ready(function() {
    console.log("✅ Script loaded, waiting for click...");

    // 1. REGISTER BUTTON
    $('#btn-register').on('click', function() {
        console.log("Registering user...");
        const data = {
            username: $('#reg-username').val(),
            mobile: $('#reg-mobile').val(),
            password: $('#reg-password').val()
        };
        socket.emit('register', data);
    });

    // 2. COMBINED LOGIN/TOGGLE BUTTON
    $('#btn-login').on('click', function() {
        // Check if we are currently looking at the Register view
        // Note: Ensure your HTML has <div id="mobile-field"> around the mobile input
        if ($('#mobile-field').is(':visible')) {
            console.log("Switching UI to Login mode...");
            $('#mobile-field').hide(); 
            $('.auth-card h2').text('Login to Arena'); 
            $('#btn-register').hide(); 
            $(this).text('Sign In Now'); 
        } else {
            console.log("Attempting Login emit...");
            const data = {
                username: $('#reg-username').val(),
                password: $('#reg-password').val()
            };
            socket.emit('login', data);
        }
    });

    // 3. LISTENERS (Keep these as they are)
    socket.on('auth-success', (user) => {
        alert("Welcome " + user.username);
        $('#auth-screen').fadeOut(); 
        $('#my-username').text(user.username).css("color", "lime");
        $('#balance').text('$' + (user.balance || 500));
    });

    socket.on('auth-error', (msg) => {
        alert(msg);
    });
});
// 3. BOARD CONFIGURATION
var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};
board = ChessBoard('myBoard', config);

// 4. LOBBY & SOCKET LOGIC
$('.bet-btn').on('click', function() {
    const amount = $(this).data('amt');
    currentRoom = `bet_${amount}`;
    
    // Change UI to searching mode
    $(this).closest('.lobby-card').html(`
        <h3>MATCHMAKING</h3>
        <p>Searching for a $${amount} opponent...</p>
        <div class="loader"></div>
    `);

    // Tell server we are looking for a match
    socket.emit('join-lobby', {
        amount: amount,
        username: "Michael", // We will make this dynamic later
        rank: "Platinum"
    });
});

// LISTEN: Match Found
socket.on('start-match', (data) => {
    console.log("Match data received:", data);
    $('#lobby').fadeOut(); 
    
    // IMPORTANT: Update the currentRoom to the one the server sent
    currentRoom = data.room; 
    
    // Assign color based on the data sent by server
    myColor = data.myColor; 
    board.orientation(myColor === 'w' ? 'white' : 'black');
    
    const opp = (myColor === 'w') ? data.black : data.white;
    $('#opp-name').text(opp.username);
});
socket.on('connect', () => {
    console.log("Connected to Server!");
    // Change the "Michael" text to "Michael (ONLINE)"
    document.getElementById('my-username').innerText = "Michael (CONNECTED)";
    document.getElementById('my-username').style.color = "lime";
});

socket.on('connect_error', (err) => {
    console.log("Connection Failed: ", err.message);
    document.getElementById('my-username').innerText = "OFFLINE";
    document.getElementById('my-username').style.color = "red";
});
// LISTEN: Opponent Move
socket.on('move-received', (move) => {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});
