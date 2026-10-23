const http = require('http');
const { spawn, exec } = require('child_process'); 

// 1. Tạo Server HTTP nhỏ để Render giữ ứng dụng luôn sống (Online)
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot Server đang chạy 24/7!');
});

server.listen(PORT, () => {
    console.log(`[+] HTTP Server đã khởi chạy thành công trên cổng ${PORT}`);
});

// =========================================================================
// CƠ CHẾ TỰ ĐỘNG XÓA CACHE HỆ THỐNG MỖI 12 TIẾNG TRÊN RENDER
// =========================================================================
const TWELVE_HOURS = 12 * 60 * 60 * 1000; // Quy đổi 12 tiếng ra mili-giây

function clearRenderCache() {
    console.log('\n[System] Kích hoạt tiến trình dọn dẹp Cache định kỳ (12 tiếng)...');

    // Lệnh 1: Xóa bộ nhớ đệm ứng dụng Node.js trong môi trường Render
    exec('npm cache clean --force', (err, stdout, stderr) => {
        if (err) console.error('[Cache] Lỗi dọn npm cache:', err.message);
        else console.log('[Cache] Đã giải phóng npm cache thành công.');
    });

    // Lệnh 2: Xóa toàn bộ file rác tạm thời sinh ra trong quá trình bot chạy ở thư mục /tmp
    exec('rm -rf /tmp/*', (err, stdout, stderr) => {
        if (err) console.error('[Cache] Lỗi dọn thư mục /tmp:', err.message);
        else console.log('[Cache] Đã xóa sạch file tạm thời trong thư mục /tmp.');
    });

    // Lệnh 3: Gọi hàm thu gom rác của V8 Engine (Nếu Node.js có bật)
    if (global.gc) {
        try {
            global.gc();
            console.log('[Cache] Đã giải phóng bộ nhớ RAM (Garbage Collection).');
        } catch (e) {
            console.error('[Cache] Lỗi chạy Garbage Collection:', e.message);
        }
    }
}

// Thiết lập đồng hồ đếm ngược tự động chạy lại sau mỗi 12 giờ
setInterval(clearRenderCache, TWELVE_HOURS);

// Chạy thử nghiệm ngay lần đầu tiên sau khi khởi động 5 giây để kiểm tra quyền hạn
setTimeout(clearRenderCache, 5000); 
// =========================================================================


// 2. Quản lý vòng đời chạy ngầm của bot2.js và bot3.js
const scripts = [
    'bot2.js',
    'bot3.js' 
];

console.log('>>> Bắt đầu kích hoạt bot2 và bot3 ngầm...\n');

function startScript(file) {
    console.log(`[+] Đang khởi động: ${file}`);
    const child = spawn('node', [file], { stdio: 'inherit', shell: true });

    child.on('error', (err) => {
        console.error(`[Lỗi] Không thể chạy file ${file}:`, err.message);
    });

    child.on('exit', (code) => {
        console.warn(`[Cảnh báo] File ${file} đã dừng hoạt động (Code: ${code}). Sẽ tự khởi động lại sau 5 giây...`);
        
        setTimeout(() => {
            startScript(file);
        }, 5000);
    });
}

scripts.forEach((file) => {
    startScript(file);
});
