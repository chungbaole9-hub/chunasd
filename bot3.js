const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const cron = require('node-cron');

const CHANNEL_ID = "1543140705206276158";
const MIN_RANDOM_NUM = 1;
const MAX_RANDOM_NUM = 10000;
const MAX_MESSAGES = 1000; 

// Biến khóa toàn cục (Global Lock) để bắt các nick phải xếp hàng, không nick nào được chat trùng khung giờ của nhau
let isGlobalChatting = false;

const HUMAN_CHAT_TEMPLATES = [
    "số mấy đây ta... {num}",
    "test nhân phẩm phát {num}",
    "ra con số gì đây? {num}",
    "mong là trúng {num} nha",
    "chốt hạ quả số {num} xem sao",
    "ae thấy số {num} có đẹp ko?",
    "làm tí vận may {num} nè",
    "gửi nhẹ cái số {num} lấy hên",
    "đỏ ăn đen chịu nha {num}",
    "bú quả số {num} xem nào",
    "chấm cái {num}",
    "vừa nằm mơ thấy số {num} luôn á",
    "đánh đại số {num} vậy",
    "xoay tua số {num} nha ae"
];

let activeClients = [];

async function getTokens() {
    let tokens = [];
    if (process.env.DISCORD_TOKEN) {
        tokens = process.env.DISCORD_TOKEN.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else if (fs.existsSync('tokens.txt')) {
        tokens = fs.readFileSync('tokens.txt', 'utf-8').split('\n').map(t => t.trim()).filter(t => t.length > 0);
    }
    return tokens;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function generateHumanMessage() {
    const template = HUMAN_CHAT_TEMPLATES[Math.floor(Math.random() * HUMAN_CHAT_TEMPLATES.length)];
    const randomNum = getRandomInt(MIN_RANDOM_NUM, MAX_RANDOM_NUM);
    return template.replace("{num}", randomNum);
}

// Hàm hỗ trợ tạo độ trễ chủ động
const delayTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startBot(token, index) {
    const client = new Client({ checkUpdate: false });
    activeClients.push(client);

    client.on('ready', async () => {
        console.log(`[Bot 3 - Acc ${index + 1}] Nick online: ${client.user.tag}`);
        
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return;

            let sentCount = 0;

            while (sentCount < MAX_MESSAGES) {
                if (!client.isReady()) break;

                // --- CƠ CHẾ GIÃN CÁCH GIỮA CÁC NICK (XẾP HÀNG TOÀN CỤC) ---
                // Nếu đang có một nick khác đang gõ hoặc vừa gõ xong, nick này phải đợi xếp hàng
                while (isGlobalChatting) {
                    await delayTime(1000); // Chờ 1 giây rồi kiểm tra lại tình trạng hàng chờ
                }

                // Chiếm quyền điều khiển kênh chat
                isGlobalChatting = true;

                // GIÃN CÁCH TRƯỚC KHI GÕ: Tạo một khoảng lặng ngẫu nhiên từ 10 đến 25 giây trước khi nick này bắt đầu động tay gõ chữ
                const silentDelay = getRandomInt(10, 25);
                await delayTime(silentDelay * 1000);

                const messageToSend = generateHumanMessage();
                
                try {
                    // Giả lập trạng thái đang gõ phím trong 2-4 giây
                    await channel.sendTyping();
                    const typingTime = getRandomInt(2, 4); 
                    await delayTime(typingTime * 1000);

                    // Gửi tin nhắn
                    await channel.send(messageToSend);
                    sentCount++;
                    console.log(`[Bot 3 - Acc ${index + 1}] Đã gõ & gửi: "${messageToSend}" (${sentCount}/${MAX_MESSAGES})`);

                } catch (err) {
                    if (err.status === 429) {
                        const retryAfter = err.retryAfter ? err.retryAfter * 1000 : 15000;
                        console.warn(`[Bot 3] Nick ${index + 1} dính Rate Limit, nhường kênh chat và chờ ${retryAfter/1000}s...`);
                        isGlobalChatting = false; // Giải phóng kênh ngay lập tức để nick khác không bị nghẽn theo
                        await delayTime(retryAfter);
                        continue;
                    } else if (err.status === 401) {
                        console.error(`[Bot 3] Nick ${index + 1} lỗi token.`);
                        isGlobalChatting = false;
                        break;
                    }
                }

                // Trả lại quyền chat cho hệ thống để các nick khác nhảy vào xếp hàng
                isGlobalChatting = false;

                if (sentCount >= MAX_MESSAGES) {
                    console.log(`[Bot 3] Nick ${index + 1} hoàn thành chỉ tiêu ngày. Đăng xuất.`);
                    await client.destroy();
                    break;
                }

                // GIÃN CÁCH RIÊNG CỦA NICK: Khoảng nghỉ cá nhân sau khi hoàn thành lượt gõ của mình (Từ 45 đến 90 giây)
                const randomBreakTrigger = getRandomInt(15, 30);
                if (sentCount % randomBreakTrigger === 0) {
                    const longBreak = getRandomInt(240, 480); // Nghỉ mỏi tay 4-8 phút
                    console.log(`[Bot 3 - Acc ${index + 1}] Nghỉ giải lao riêng ${(longBreak/60).toFixed(1)} phút...`);
                    await delayTime(longBreak * 1000);
                } else {
                    const normalDelay = getRandomFloat(45, 90);
                    await delayTime(normalDelay * 1000);
                }
            }

        } catch (err) {
            console.error(`[Bot 3] Lỗi nick ${index + 1}:`, err.message);
            isGlobalChatting = false; // Đảm bảo giải phóng khóa nếu có lỗi kênh xảy ra
        }
    });

    client.login(token).catch(() => {
        console.error(`[Bot 3 - Acc ${index + 1}] Lỗi đăng nhập.`);
    });
}

async function runAllBots() {
    console.log('[System] Đang khởi động các tài khoản so le...');
    const tokens = await getTokens();
    if (tokens.length === 0) return;
    
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        // GIÃN CÁCH KHI BẬT MÁY: Mỗi nick đăng nhập cách nhau từ 1 đến 3 phút để tránh bị Discord quét IP đăng nhập đồng loạt
        if (index > 0) {
            const startupDelay = getRandomInt(60, 180);
            console.log(`[System] Chờ ${startupDelay}s trước khi cho Nick ${index + 1} vào mạng...`);
            await delayTime(startupDelay * 1000);
        }
        startBot(token, index);
    }
}

// Lên lịch chạy lúc 1:10 sáng VN
cron.schedule('10 18 * * *', async () => {
    console.log('[System] Làm mới tiến trình ngày mới...');
    for (let client of activeClients) {
        try { await client.destroy(); } catch (e) {}
    }
    activeClients = [];
    isGlobalChatting = false; // Reset lại khóa hàng chờ cho ngày mới
    runAllBots();
});

runAllBots();
