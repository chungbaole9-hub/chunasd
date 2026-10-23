const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const cron = require('node-cron');

const CHANNEL_ID = "1543140705206276158";
const MIN_RANDOM_NUM = 1;
const MAX_RANDOM_NUM = 10000;
const MAX_MESSAGES = 1000; 

// Thư viện mẫu câu phong phú, bắt chước ngôn ngữ chat tự nhiên của game thủ/user
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

async function startBot(token, index) {
    // TẬP TÍNH NGƯỜI THẬT 1: Tắt tự động kiểm tra update để tránh gửi request lạ lên github, giả lập client sạch
    const client = new Client({ checkUpdate: false });
    activeClients.push(client);

    client.on('ready', async () => {
        console.log(`[Bot 3 - Acc ${index + 1}] Người dùng thật online: ${client.user.tag}`);
        
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) return;

            let sentCount = 0;

            while (sentCount < MAX_MESSAGES) {
                if (!client.isReady()) break;

                const messageToSend = generateHumanMessage();
                
                try {
                    // TẬP TÍNH NGƯỜI THẬT 2: Bật trạng thái "Đang gõ phím... (Typing...)"
                    // Người thật cần từ 2 đến 4 giây để gõ xong một câu chat
                    await channel.sendTyping();
                    const typingTime = getRandomInt(2, 4); 
                    await new Promise(resolve => setTimeout(resolve, typingTime * 1000));

                    // Tiến hành gửi tin nhắn sau khi gõ xong
                    await channel.send(messageToSend);
                    sentCount++;
                    console.log(`[Bot 3 - Acc ${index + 1}] Đã gõ & gửi: "${messageToSend}" (${sentCount}/${MAX_MESSAGES})`);

                } catch (err) {
                    if (err.status === 429) {
                        const retryAfter = err.retryAfter ? err.retryAfter * 1000 : 15000;
                        console.warn(`[Bot 3] Dính Rate Limit. Đang giả vờ treo máy chờ ${retryAfter/1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                        continue;
                    } else if (err.status === 401) {
                        console.error(`[Bot 3] Token lỗi hoặc bị block.`);
                        break;
                    }
                }

                if (sentCount >= MAX_MESSAGES) {
                    console.log(`[Bot 3] Đạt giới hạn tin nhắn ngày. Đăng xuất giả lập đi ngủ.`);
                    await client.destroy();
                    break;
                }

                // TẬP TÍNH NGƯỜI THẬT 3: Cơ chế "Mỏi tay - Giải lao ngẫu nhiên"
                // Cứ sau một khoảng tin nhắn ngẫu nhiên (từ 15-30 câu), người thật sẽ dừng lại lướt TikTok hoặc làm việc khác
                const randomBreakTrigger = getRandomInt(15, 30);
                if (sentCount % randomBreakTrigger === 0) {
                    const longBreak = getRandomInt(240, 600); // Nghỉ dài hẳn từ 4 đến 10 phút
                    console.log(`[Bot 3 - Acc ${index + 1}] Đang nghỉ giải lao lướt mạng khoảng ${(longBreak/60).toFixed(1)} phút...`);
                    await new Promise(resolve => setTimeout(resolve, longBreak * 1000));
                } else {
                    // Giãn cách thông thường siêu ngẫu nhiên từ 25 đến 55 giây (Không cố định thời gian)
                    const normalDelay = getRandomFloat(25, 55);
                    await new Promise(resolve => setTimeout(resolve, normalDelay * 1000));
                }
            }

        } catch (err) {
            console.error(`[Bot 3] Lỗi:`, err.message);
        }
    });

    client.login(token).catch(() => {});
}

async function runAllBots() {
    const tokens = await getTokens();
    if (tokens.length === 0) return;
    
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        // TẬP TÍNH NGƯỜI THẬT 4: Nếu chạy nhiều acc, thời gian thức dậy của các acc lệch nhau rất xa (từ 1 đến 3 phút)
        if (index > 0) {
            const startupDelay = getRandomInt(60, 180);
            console.log(`[System] Chờ người dùng thứ ${index + 1} mở máy tính lên (Delay ${startupDelay}s)...`);
            await new Promise(resolve => setTimeout(resolve, startupDelay * 1000));
        }
        startBot(token, index);
    }
}

// Lên lịch chạy lúc 1:10 sáng VN
cron.schedule('10 18 * * *', async () => {
    for (let client of activeClients) {
        try { await client.destroy(); } catch (e) {}
    }
    activeClients = [];
    runAllBots();
});

runAllBots();
