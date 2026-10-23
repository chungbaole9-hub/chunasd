const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const cron = require('node-cron');

const CHANNEL_ID = "1543140705206276158";
const MIN_RANDOM_NUM = 1;
const MAX_RANDOM_NUM = 10000;
const MAX_MESSAGES = 1000; // Giới hạn tin nhắn mỗi acc

// Mảng các mẫu câu chat tự nhiên (Spintax) để bọc con số, tránh bị AutoMod bắt lỗi trùng lặp
const CHAT_TEMPLATES = [
    "Hôm nay số may mắn là {num} nhỉ",
    "Thử vận may phát xem sao: {num}",
    "Check số {num}",
    "Làm tí số {num} cho xôm",
    "Số của tôi là {num} nhé",
    "Gửi nhẹ cái số {num}",
    "Chấm phát {num}",
    "Số đẹp này: {num}",
    "{num} nha anh em",
    "Không biết có trúng không {num}"
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

// Hàm tạo tin nhắn ngẫu nhiên để đánh lừa bot quét từ ngữ
function generateNaturalMessage() {
    const template = CHAT_TEMPLATES[Math.floor(Math.random() * CHAT_TEMPLATES.length)];
    const randomNum = getRandomInt(MIN_RANDOM_NUM, MAX_RANDOM_NUM);
    return template.replace("{num}", randomNum);
}

async function startBot(token, index) {
    const client = new Client({ checkUpdate: false });
    activeClients.push(client);

    client.on('ready', async () => {
        console.log(`[Acc ${index + 1}] Đã đăng nhập: ${client.user.tag}`);
        
        try {
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (!channel) {
                console.error(`[Acc ${index + 1}] Không tìm thấy kênh với ID: ${CHANNEL_ID}`);
                return;
            }
            console.log(`[Acc ${index + 1}] Bắt đầu tiến trình ẩn danh vào kênh: ${channel.name}`);

            let sentCount = 0;

            while (sentCount < MAX_MESSAGES) {
                if (!client.isReady()) break;

                // Tạo nội dung tin nhắn đã được trộn văn bản tự nhiên
                const messageToSend = generateNaturalMessage();
                
                try {
                    await channel.send(messageToSend);
                    sentCount++;
                    console.log(`[Acc ${index + 1}] Gửi thành công: "${messageToSend}" (${sentCount}/${MAX_MESSAGES})`);
                } catch (err) {
                    if (err.status === 429 || (err.message && err.message.includes('rate limit'))) {
                        const retryAfter = err.retryAfter ? err.retryAfter * 1000 : 10000;
                        console.warn(`[Acc ${index + 1}] Bị Rate Limit! Chờ ${(retryAfter / 1000).toFixed(1)}s...`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                        continue;
                    } else if (err.status === 401) {
                        console.error(`[Acc ${index + 1}] Token die hoặc bị checkpoint!`);
                        break;
                    } else {
                        console.error(`[Acc ${index + 1}] Lỗi chat:`, err.message);
                    }
                }

                if (sentCount >= MAX_MESSAGES) {
                    console.log(`[Acc ${index + 1}] Hoàn thành hạn ngạch ${MAX_MESSAGES} tin nhắn.`);
                    await client.destroy();
                    break;
                }

                // CƠ CHẾ NÉ BOT 1: Cứ sau mỗi 25 tin nhắn, cho acc "nghỉ giải lao" từ 3 đến 5 phút để giả lập người dùng thật nghỉ ngơi
                if (sentCount % 25 === 0) {
                    const breakTime = getRandomInt(180, 300); // 3-5 phút
                    console.log(`[Acc ${index + 1}] Cơ chế an toàn kích hoạt: Nghỉ giải lao ${breakTime} giây...`);
                    await new Promise(resolve => setTimeout(resolve, breakTime * 1000));
                } else {
                    // CƠ CHẾ NÉ BOT 2: Giãn cách ngẫu nhiên từ 20 đến 45 giây giữa các tin nhắn thông thường
                    const delay = getRandomFloat(20, 45);
                    await new Promise(resolve => setTimeout(resolve, delay * 1000));
                }
            }

        } catch (err) {
            console.error(`[Acc ${index + 1}] Lỗi kênh:`, err.message);
        }
    });

    client.on('shardDisconnect', () => {
        console.warn(`[Acc ${index + 1}] Mất kết nối mạng!`);
    });

    client.login(token).catch(() => {
        console.error(`[Acc ${index + 1}] Lỗi đăng nhập token!`);
    });
}

// CƠ CHẾ NÉ BOT 3: Khởi động so le (Delay đúp) giữa các tài khoản để không bị trùng IP gửi lên cùng lúc
async function runAllBots() {
    console.log('[System] Đang chuẩn bị chạy các tài khoản so le nhau...');
    const tokens = await getTokens();
    if (tokens.length === 0) {
        console.error("Không có token!");
        return;
    }
    
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        // Mỗi tài khoản kích hoạt cách nhau từ 10 đến 20 giây
        if (index > 0) {
            const startupDelay = getRandomInt(10, 20);
            console.log(`[System] Chờ ${startupDelay}s trước khi khởi động Acc ${index + 1}...`);
            await new Promise(resolve => setTimeout(resolve, startupDelay * 1000));
        }
        startBot(token, index);
    }
}

// Giữ nguyên lịch chạy 1:10 sáng VN (18:10 UTC) của bạn
cron.schedule('10 18 * * *', async () => {
    console.log('[System] Khởi động lại tiến trình ngày mới...');
    for (let client of activeClients) {
        try {
            await client.destroy();
        } catch (e) {}
    }
    activeClients = [];
    runAllBots();
});

runAllBots();
