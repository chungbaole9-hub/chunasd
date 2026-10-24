const http = require('http');
const { spawn } = require('child_process');

let PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot Server đang chạy 24/7!');
});

// Tự động xử lý nếu cổng bị chiếm mà không làm crash ứng dụng
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`[-] Cổng ${PORT} đã bị chiếm, hệ thống đang tự động chuyển sang cổng ngẫu nhiên khác...`);
        server.listen(0); // Tự động chọn 1 cổng trống bất kỳ
    } else {
        console.error('[Lỗi Server]:', err);
    }
});

server.listen(PORT, () => {
    console.log(`[+] HTTP Server đã khởi chạy thành công trên cổng ${server.address().port}`);
});

const scripts = [
    'bot1.js',
    'bot2.js',
    'bot3.js',
    'bot4.js',
    'bot5.js',
    'bot6.js',
    'bot7.js'
];

console.log('>>> Bắt đầu kích hoạt hệ thống 7 nhóm bot (28 token)...\n');

scripts.forEach((file) => {
    const child = spawn('node', [file], { stdio: 'inherit', shell: true });

    child.on('error', (err) => {
        console.error(`[Lỗi] Không thể chạy file ${file}:`, err.message);
    });

    child.on('exit', (code) => {
        console.warn(`[Cảnh báo] File ${file} đã dừng (Code: ${code}). Khởi động lại sau 5s...`);
        setTimeout(() => {
            spawn('node', [file], { stdio: 'inherit', shell: true });
        }, 5000);
    });
});