const http = require('http');
const { spawn } = require('child_process');

// 1. HTTP Server giữ ứng dụng sống trên Render
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot Server đang chạy 24/7!');
});

server.listen(PORT, () => {
    console.log(`[+] HTTP Server đã khởi chạy thành công trên cổng ${PORT}`);
});

// 2. Định kỳ thu gom rác RAM (Garbage Collection) mỗi 6 tiếng
const SIX_HOURS = 6 * 60 * 60 * 1000;

function cleanMemory() {
    if (global.gc) {
        try {
            global.gc();
            console.log('[Memory] Đã giải phóng RAM (Garbage Collection).');
        } catch (e) {
            console.error('[Memory] Lỗi Garbage Collection:', e.message);
        }
    } else {
        console.log('[Memory] Cần bật flag --expose-gc trong package.json để tối ưu RAM.');
    }
}

setInterval(cleanMemory, SIX_HOURS);

// 3. Danh sách các file bot cần chạy ngầm (Đã bật cả bot2 và bot3)
const scripts = [
    'bot2.js',
    'bot3.js'
];

console.log('>>> Bắt đầu kích hoạt tiến trình bot ngầm...\n');

function startScript(file) {
    console.log(`[+] Đang khởi động tiến trình: ${file}`);
    const child = spawn('node', [file], { stdio: 'inherit', shell: true });

    child.on('error', (err) => {
        console.error(`[Lỗi] Không thể chạy file ${file}:`, err.message);
    });

    child.on('exit', (code) => {
        console.warn(`[Cảnh báo] Tiến trình ${file} dừng (Code: ${code}). Khởi động lại sau 5s...`);
        setTimeout(() => {
            startScript(file);
        }, 5000);
    });
}

scripts.forEach((file) => {
    startScript(file);
});
