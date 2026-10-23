const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const cron = require('node-cron');

const CHANNEL_ID = "1543140705206276158";
const MIN_RANDOM_NUM = 1;
const MAX_RANDOM_NUM = 10000;
const MAX_MESSAGES = 200; // Hạ chỉ tiêu xuống mức an toàn để tránh bị Discord ban token

let isGlobalChatting = false; // Biến khóa hàng chờ toàn cục

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

                // Xếp hàng: Chờ nick khác hoàn thành lượt
                while (isGlobalChatting) {
                    await delayTime(1000);
                }

                // BẮT ĐẦU CHIẾM KHÓA
                isGlobalChatting = true;

                try {
                    // Giãn cách trước khi gõ chữ (10 - 25s)
                    const silentDelay = getRandomInt(10, 25);
                    await delayTime(silentDelay * 1000);

                    const messageToSend = generateHumanMessage();

                    // Giả lập trạng thái đang gõ phím (2 - 4s)
                    await channel.sendTyping();
                    const typingTime = getRandomInt(2, 4); 
                    await delayTime(typingTime * 1000);

                    // Gửi tin nhắn
                    await channel.send(messageToSend);
                    sentCount++;
                    console.log(`[Bot 3 - Acc ${index + 1}] Đã gửi: "${messageToSend}" (${sentCount}/${MAX_MESSAGES})`);

                } catch (err) {
                    if (err.status === 429) {
                        const retryAfter = err.retryAfter ? err.retryAfter * 1000 : 15000;
                        console.warn(`[Bot 3] Nick ${index + 1} dính Rate Limit, nhường kênh và chờ ${retryAfter/1000}s...`);
                        await delayTime(retryAfter);
                    } else if (err.status === 401) {
                        console.error(`[Bot 3] Nick ${index + 1} lỗi token.`);
                        break;
                    } else {
                        console.error(`[Bot 3] Nick ${index + 1} lỗi gửi tin:`, err.message);
                    }
                } finally {
                    // GIẢI PHÓNG KHÓA LUÔN LUÔN ĐƯỢC THỰC THI (DÙ LỖI HAY THÀNH CÔNG)
                    isGlobalChatting = false;
                }

                if (sentCount >= MAX_MESSAGES) {
                    console.log(`[Bot 3] Nick ${index + 1} hoàn thành chỉ tiêu. Đăng xuất.`);
                    await client.destroy();
                    break;
                }

                // Giãn cách cá nhân sau mỗi lượt gõ thành công
                const randomBreakTrigger = getRandomInt(10, 20);
                if (sentCount % randomBreakTrigger === 0) {
                    const longBreak = getRandomInt(240, 480); // Nghỉ 4 - 8 phút
                    console.log(`[Bot 3 - Acc ${index + 1}] Nghỉ giải lao ${(longBreak/60).toFixed(1)} phút...`);
                    await delayTime(longBreak * 1000);
                } else {
                    const normalDelay = getRandomFloat(45, 90);
                    await delayTime(normalDelay * 1000);
                }
            }

        } catch (err) {
            console.error(`[Bot 3] Lỗi nick ${index + 1}:`, err.message);
            isGlobalChatting = false;
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
        if (index > 0) {
            const startupDelay = getRandomInt(60, 180);
            console.log(`[System] Chờ ${startupDelay}s trước khi cho Nick ${index + 1} vào mạng...`);
            await delayTime(startupDelay * 1000);
        }
        startBot(token, index);
    }
}

// Lên lịch reset làm mới tiến trình lúc 1:10 sáng VN (18:10 UTC)
cron.schedule('10 18 * * *', async () => {
    console.log('[System] Làm mới tiến trình ngày mới...');
    for (let client of activeClients) {
        try { await client.destroy(); } catch (e) {}
    }
    activeClients = [];
    isGlobalChatting = false;
    runAllBots();
});

runAllBots();
