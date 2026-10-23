const http = require('http');
const { spawn } = require('child_process');

// 1. Tạo Server HTTP nhỏ để Render giữ ứng dụng luôn sống (Online)
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot Server đang chạy 24/7!');
});

server.listen(PORT, () => {
    console.log(`[+] HTTP Server đã khởi chạy thành công trên cổng ${PORT}`);
});

// 2. Danh sách các file bot cần chạy ngầm cùng lúc
const scripts = [
    'bot2.js',
    'bot3.js' // bot3.js đã được cấu hình chạy song song tại đây
];

console.log('>>> Bắt đầu kích hoạt bot2 và bot3 ngầm...\n');

// Hàm chạy bot và tự động gán lại sự kiện hồi sinh khi crash
function startScript(file) {
    console.log(`[+] Đang khởi động: ${file}`);
    const child = spawn('node', [file], { stdio: 'inherit', shell: true });

    child.on('error', (err) => {
        console.error(`[Lỗi] Không thể chạy file ${file}:`, err.message);
    });

    child.on('exit', (code) => {
        console.warn(`[Cảnh báo] File ${file} đã dừng hoạt động (Code: ${code}). Sẽ tự khởi động lại sau 5 giây...`);
        
        // Gọi lại chính hàm này để tạo tiến trình mới và gán lại toàn bộ sự kiện theo vòng lặp
        setTimeout(() => {
            startScript(file);
        }, 5000);
    });
}

// Kích hoạt toàn bộ danh sách bot
scripts.forEach((file) => {
    startScript(file);
});
