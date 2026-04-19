const { Client, GatewayIntentBits, Events, SlashCommandBuilder, PermissionsBitField, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent     // Required for !listtags fallback
    ]
});

const FORUM_CHANNEL_IDS = new Set([
    '1118634013242953808',
    '1118633698179428362'
]);

// ← ADD YOUR TARGET TAG IDs HERE (as strings)
const TARGET_TAG_IDS = new Set([
    'YOUR_FIRST_TAG_ID_HERE',
    'YOUR_SECOND_TAG_ID_HERE',
    // Add more here, one per line
]);

const BOT_TOKEN = process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE';  // Use environment variable on Render
const CLIENT_ID = process.env.CLIENT_ID;

client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot is online! Watching ${FORUM_CHANNEL_IDS.size} forum(s) for ${TARGET_TAG_IDS.size} tag(s).`);

    // Register slash commands
    const commands = [
        new SlashCommandBuilder()
            .setName('listtags')
            .setDescription('List all available tags in the current forum channel with their IDs')
            .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageThreads)
    ];

    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Slash commands registered.');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'listtags') {
        const channel = interaction.channel;
        if (!channel || !FORUM_CHANNEL_IDS.has(channel.id) || channel.type !== 15) {
            return interaction.reply({ content: 'Please run this command inside one of the target forum channels!', ephemeral: true });
        }

        if (!channel.availableTags || channel.availableTags.length === 0) {
            return interaction.reply({ content: 'No tags found in this forum channel.', ephemeral: true });
        }

        let reply = '**Available Forum Tags:**\n';
        for (const tag of channel.availableTags) {
            reply += `**Name:** ${tag.name} | **ID:** \`${tag.id}\`\n`;
        }
        await interaction.reply({ content: reply, ephemeral: true });
    }
});

// Fallback prefix command
client.on(Events.MessageCreate, async message => {
    if (message.content.toLowerCase() === '!listtags' && 
        message.member.permissions.has(PermissionsBitField.Flags.ManageThreads)) {
        
        const channel = message.channel;
        if (!FORUM_CHANNEL_IDS.has(channel.id) || channel.type !== 15) {
            return message.reply('Please run this in one of the configured forum channels!');
        }

        if (!channel.availableTags || channel.availableTags.length === 0) {
            return message.reply('No tags found.');
        }

        let reply = '**Forum Tags:**\n';
        for (const tag of channel.availableTags) {
            reply += `**Name:** ${tag.name} | **ID:** \`${tag.id}\`\n`;
        }
        await message.reply(reply);
    }
});

client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
    if (!FORUM_CHANNEL_IDS.has(newThread.parentId)) return;

    const beforeTags = new Set(oldThread.appliedTags || []);
    const afterTags = new Set(newThread.appliedTags || []);

    const newlyApplied = [...afterTags].filter(tagId => 
        TARGET_TAG_IDS.has(tagId) && !beforeTags.has(tagId)
    );

    if (newlyApplied.length === 0) return;

    try {
        await newThread.edit({
            locked: true,
            archived: true,
            reason: `Auto-locked & closed - tag(s) applied: ${newlyApplied.join(', ')}`
        });

        // Confirmation message in the thread
        await newThread.send({
            content: `🔒 This post has been automatically **locked and closed** because one or more special tags were applied.`
        });

        console.log(`✅ Auto-locked & closed: "${newThread.name}" (${newThread.id}) | Tags: ${newlyApplied}`);
    } catch (error) {
        if (error.code === 50013) {
            console.error('❌ Bot is missing "Manage Threads" permission!');
        } else {
            console.error('Error editing thread:', error);
        }
    }
});

client.login(BOT_TOKEN);
