const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

const TOKEN_FILE = 'tokens.txt';

async function getTokens() {
    let tokens = [];
    if (process.env.DISCORD_TOKEN) {
        tokens = process.env.DISCORD_TOKEN.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } else if (fs.existsSync(TOKEN_FILE)) {
        tokens = fs.readFileSync(TOKEN_FILE, 'utf-8').split('\n').map(t => t.trim()).filter(t => t.length > 0 && !t.startsWith('#'));
    }
    return tokens;
}

async function connectVoice(token, index, channelId, botName) {
    const client = new Client({ checkUpdate: false });

    async function joinVoice() {
        try {
            const channel = await client.channels.fetch(channelId);
            client.ws.broadcast({
                op: 4,
                d: {
                    guild_id: channel.guild.id,
                    channel_id: channelId,
                    self_mute: true,
                    self_deaf: true,
                }
            });
            console.log(`[${botName} - Acc ${index + 1}] -> Treo thành công vào phòng: ${channel.name}`);
        } catch (err) {
            console.error(`[${botName} - Acc ${index + 1}] Lỗi kết nối voice:`, err.message);
        }
    }

    client.on('ready', () => {
        console.log(`[${botName} - Acc ${index + 1}] Đã đăng nhập: ${client.user.tag}`);
        joinVoice();
        setInterval(joinVoice, 15 * 60 * 1000);
    });

    client.on('shardDisconnect', () => {
        console.warn(`[${botName} - Acc ${index + 1}] Mất kết nối! Đang thử vào lại sau 5s...`);
        setTimeout(joinVoice, 5000);
    });

    client.login(token).catch(() => {
        console.error(`[${botName} - Acc ${index + 1}] Token lỗi hoặc không hợp lệ!`);
    });
}

(async () => {
    const tokens = await getTokens();
    if (tokens.length === 0) {
        console.error("[Voice Manager] Không tìm thấy token nào!");
        process.exit(1);
    }

    console.log(`\n>>> Đang khởi chạy hệ thống phân bổ phòng Voice cho ${tokens.length} tài khoản...\n`);

    tokens.forEach((token, index) => {
        // 1. Room 1076832301972987954: Chỉ treo token 1 (index 0)
        if (index === 0) {
            connectVoice(token, index, "1076832301972987954", "Room-1");
        }

        // 2. Room 1542073179722227742: Treo tất cả ngoại trừ Token 4 (index 3)
        if (index !== 3) {
            connectVoice(token, index, "1542073179722227742", "Room-2");
        }

        // 3. Room 1543140705206276158: Treo cả 4 token
        connectVoice(token, index, "1543140705206276158", "Room-3");
    });
})();