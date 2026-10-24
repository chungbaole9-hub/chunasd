const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const VOICE_CHANNEL_ID = "1543140705206276158";

async function getTokens() {
    let tokens = [];
    if (fs.existsSync('tokens.txt')) {
        tokens = fs.readFileSync('tokens.txt', 'utf-8').split('\n').map(t => t.trim()).filter(t => t.length > 0 && !t.startsWith('#'));
    }
    return tokens.slice(0, 4);
}

async function connectVoice(token, index, channelId) {
    const client = new Client({ checkUpdate: false });
    async function joinVoice() {
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) return;
            client.ws.broadcast({ op: 4, d: { guild_id: channel.guild.id, channel_id: channelId, self_mute: true, self_deaf: true } });
            console.log(`[Bot 1 - Acc ${index + 1}] -> Vào phòng thành công: ${channel.name}`);
        } catch (err) {}
    }
    client.on('ready', () => { joinVoice(); });
    client.on('shardDisconnect', () => { setTimeout(joinVoice, 5000); });
    client.login(token).catch(() => {});
}

const delayTime = (ms) => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const tokens = await getTokens();
    for (let index = 0; index < tokens.length; index++) {
        if (index > 0) await delayTime(3000);
        connectVoice(tokens[index], index, VOICE_CHANNEL_ID);
    }
})();