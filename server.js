const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// إعداد الجلسة لتخزين حالة تسجيل الدخول
app.use(session({
    secret: 'your-secret-key',  // ضع هنا مفتاح سري
    resave: false,
    saveUninitialized: true
}));

// تخزين المستخدمين والرسائل
const users = {};  
const messages = {};  

// صفحة تسجيل الدخول
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// التحقق من بيانات تسجيل الدخول
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Amineadmin2009' && password === '2009202426') {
        req.session.isAdmin = true; // حفظ حالة المسؤولية في الجلسة
        res.redirect('/admin');
    } else {
        req.session.isAdmin = false;
        res.redirect('/chat'); // إعادة توجيه المستخدمين العاديين إلى واجهة الدردشة
    }
});

// التحقق من حالة تسجيل دخول المسؤول
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/'); // إعادة توجيه إلى صفحة تسجيل الدخول
    }
}

// عرض صفحة لوحة التحكم
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// عرض صفحة الدردشة
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// إدارة اتصالات Socket.io
io.on('connection', (socket) => {
    console.log('User connected');

    // استقبال اسم المستخدم عند التسجيل
    socket.on('register', (username) => {
        users[socket.id] = { username }; 
        messages[socket.id] = messages[socket.id] || []; 
        console.log(`New user registered: ${username}`);
        
        io.emit('userListUpdate', Object.keys(users).map(id => ({ id, username: users[id].username })));
        socket.emit('previousMessages', messages[socket.id]);
    });

    // استقبال الرسالة من المستخدم وإرسالها إلى لوحة التحكم
    socket.on('message', (msg) => {
        const username = users[socket.id].username;
        const userMessage = { username, msg, timestamp: new Date().toLocaleString() };
        messages[socket.id].push(userMessage);
        io.emit('adminMessage', { id: socket.id, ...userMessage });
    });

    // إرسال الرسائل إلى مستخدم معين من قبل المسؤول
    socket.on('adminToUser', ({ userId, message }) => {
        if (users[userId]) {
            io.to(userId).emit('message', { from: 'Ask The Boot', message });
        }
    });

    // عند انقطاع اتصال المستخدم
    socket.on('disconnect', () => {
        console.log(`User ${users[socket.id]?.username} disconnected`);
        delete users[socket.id];
        io.emit('userListUpdate', Object.keys(users).map(id => ({ id, username: users[id]?.username })));
    });
});

// بدء تشغيل الخادم
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
const socket = io(); // إذا كانت الإعدادات تسمح، سيعمل محليًا وخارجيًا
