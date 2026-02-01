// 1. INITIALIZE CONSTANTS
const socket = io("https://linwood-feudalistic-lorenzo.ngrok-free.dev");
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
    $('#lobby').fadeOut(); // Hide the betting screen
    
    // Assign color based on socket ID
    myColor = (socket.id === data.white.id) ? 'w' : 'b';
    board.orientation(myColor === 'w' ? 'white' : 'black');
    
    // Update Opponent Info
    const opp = (myColor === 'w') ? data.black : data.white;
    $('#opp-name').text(opp.username);
    console.log(`Match started! You are ${myColor === 'w' ? 'White' : 'Black'}`);
});

// LISTEN: Opponent Move
socket.on('move-received', (move) => {
    game.move(move);
    board.position(game.fen());
    updateStatus();
});