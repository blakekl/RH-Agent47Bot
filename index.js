const { Client, GatewayIntentBits, Events, SlashCommandBuilder, PermissionsBitField, REST, Routes, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const BOT_TOKEN = process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE';
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Helper to parse comma-separated env vars into a Set
const parseEnvSet = (envVar) =>
    new Set((envVar || '').split(',').map(id => id.trim()).filter(Boolean));

const FORUM_CHANNEL_IDS = parseEnvSet(process.env.FORUM_CHANNEL_IDS);
const TARGET_TAG_IDS = parseEnvSet(process.env.TARGET_TAG_IDS);
// Extract the first channel ID from the set for logging
const LOGGING_CHANNEL_ID = [...parseEnvSet(process.env.LOGGING_CHANNEL)][0];

/**
 * Sends structured log messages to the console and the designated Discord logging channel.
 */
async function logMessage(message) {
    console.log(message);
    if (!LOGGING_CHANNEL_ID) return;

    try {
        const channel = await client.channels.fetch(LOGGING_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            await channel.send(message);
        }
    } catch (error) {
        console.error(`Failed to send log to channel ${LOGGING_CHANNEL_ID}:`, error);
    }
}

/**
 * Closes and archives a target thread if it contains target tags.
 */
async function closeThreadIfNeeded(thread, reasonPrefix = 'Auto-locked') {
    const hasTargetTag = thread.appliedTags?.some(tagId => TARGET_TAG_IDS.has(tagId));
    if (!hasTargetTag) return false;

    const matchedTags = thread.appliedTags.filter(tagId => TARGET_TAG_IDS.has(tagId));

    await thread.send({
        content: `💼 Contract complete This Thread is now locked and archived.`
    });

    await thread.edit({
        locked: true,
        archived: true,
        reason: `${reasonPrefix} - tag(s) applied: ${matchedTags.join(', ')}`
    });

    // Formatting readable thread link: <#THREAD_ID> turns into clickable #thread-name link
    const threadLink = `<#${thread.id}>`;
    await logMessage(
        `💼 Contract complete.This Thread is now locked and archived.\n` +
        `**Thread:** ${threadLink} | **Name:** "${thread.name}" | **ID:** \`${thread.id}\` | **Tags:** ${matchedTags.join(', ')}`
    );

    return true;
}

async function runCloseNowScan() {
    let closedCount = 0;

    for (const forumId of FORUM_CHANNEL_IDS) {
        try {
            console.log(`🔍 Fetching forum channel: ${forumId}...`);
            const forumChannel = await client.channels.fetch(forumId);
            
            if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                console.log(`⚠️ Channel ${forumId} is not a valid GuildForum channel.`);
                continue;
            }

            // Fetch active threads across the guild, then filter for this specific forum
            console.log(`🔍 Fetching active threads in guild for forum: ${forumChannel.name}...`);
            const activeThreadsResponse = await forumChannel.guild.channels.fetchActiveThreads();
            const threads = activeThreadsResponse.threads.filter(
                t => t.parentId === forumId && !t.archived && !t.locked
            );

            console.log(`📌 Found ${threads.size} active thread(s) in "${forumChannel.name}". Processing...`);

            for (const [_, thread] of threads) {
                const closed = await closeThreadIfNeeded(thread, 'Manual sweep (/closenow)');
                if (closed) closedCount++;
            }
        } catch (error) {
            console.error(`❌ Error scanning forum ${forumId}:`, error);
        }
    }

    return closedCount;
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot is online! Watching ${FORUM_CHANNEL_IDS.size} forum(s) for ${TARGET_TAG_IDS.size} tag(s).`);

    const commands = [
        new SlashCommandBuilder()
            .setName('closenow')
            .setDescription('Scans all configured forum posts and closes any active threads containing target tags.')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageThreads)
    ];

    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log('✅ Guild slash commands registered instantly.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

async function runCloseNowScan() {
    let closedCount = 0;

    for (const forumId of FORUM_CHANNEL_IDS) {
        try {
            console.log(`🔍 Fetching forum channel: ${forumId}...`);
            const forumChannel = await client.channels.fetch(forumId);
            
            if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
                console.log(`⚠️ Channel ${forumId} is not a valid GuildForum channel.`);
                continue;
            }

            // Fetch active threads across the guild, then filter for this specific forum
            console.log(`🔍 Fetching active threads in guild for forum: ${forumChannel.name}...`);
            const activeThreadsResponse = await forumChannel.guild.channels.fetchActiveThreads();
            const threads = activeThreadsResponse.threads.filter(
                t => t.parentId === forumId && !t.archived && !t.locked
            );

            console.log(`📌 Found ${threads.size} active thread(s) in "${forumChannel.name}". Processing...`);

            for (const [_, thread] of threads) {
                const closed = await closeThreadIfNeeded(thread, 'Manual sweep (/closenow)');
                if (closed) closedCount++;
            }
        } catch (error) {
            console.error(`❌ Error scanning forum ${forumId}:`, error);
        }
    }

    return closedCount;
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'closenow') {
        console.log(`⚙️ Executing /closenow command triggered by ${interaction.user.tag}...`);

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageThreads)) {
            return interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
        }

        try {
            // Defer immediately so Discord knows the bot is working (3-second window limit)
            await interaction.deferReply({ ephemeral: true });

            const closedCount = await runCloseNowScan();

            await interaction.editReply({ content: `Sweep complete. Closed **${closedCount}** thread(s).` });
            console.log(`✅ Sweep execution finished. Total closed: ${closedCount}`);
        } catch (error) {
            console.error('❌ Error handling /closenow command:', error);
            
            // Fallback response if defer/edit fails
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'An error occurred while executing the sweep.' }).catch(() => {});
            } else {
                await interaction.reply({ content: 'An error occurred while executing the sweep.', ephemeral: true }).catch(() => {});
            }
        }
    }
});

// Fallback prefix command (!closenow)
client.on(Events.MessageCreate, async message => {
    if (message.content.toLowerCase() === '!closenow' &&
        message.member.permissions.has(PermissionsBitField.Flags.ManageThreads)) {

        const replyMsg = await message.reply('Starting scan for open threads with target tags...');
        const closedCount = await runCloseNowScan();
        await replyMsg.edit(`Sweep complete. Closed **${closedCount}** thread(s).`);
    }
});

client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
    if (!FORUM_CHANNEL_IDS.has(newThread.parentId)) return;
    if (newThread.locked || newThread.archived) return;

    const beforeTags = new Set(oldThread.appliedTags || []);
    const afterTags = new Set(newThread.appliedTags || []);

    const newlyApplied = [...afterTags].filter(tagId =>
        TARGET_TAG_IDS.has(tagId) && !beforeTags.has(tagId)
    );

    if (newlyApplied.length === 0) return;

    try {
        await closeThreadIfNeeded(newThread, 'Auto-locked on tag update');
    } catch (error) {
        if (error.code === 50013) {
            console.error('❌ Bot is missing "Manage Threads" permission!');
        } else {
            console.error('Error editing thread:', error);
        }
    }
});

client.login(BOT_TOKEN);
