import { Client, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log("Bot is online!");
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith("!")) return;

  let conversationLog: ChatCompletionRequestMessage[] = [
    { role: "system", content: "You are a friendly chatbot." },
  ];

  try {
    await message.channel.sendTyping();

    const prevMessages = await (message.channel as TextChannel).messages.fetch({
      limit: 15,
    });
    const sortedMessages = prevMessages.sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    sortedMessages.forEach((msg) => {
      if (msg.content.startsWith("!")) return;
      if (msg.author.id !== client.user?.id && message.author.bot) return;
      if (msg.author.id === client.user?.id) {
        conversationLog.push({
          role: "assistant",
          content: msg.content,
          name: msg.author.username
            .replace(/\s+/g, "_")
            .replace(/[^\w\s]/gi, ""),
        });
      }
      if (msg.author.id === message.author.id) {
        conversationLog.push({
          role: "user",
          content: msg.content,
          name: message.author.username
            .replace(/\s+/g, "_")
            .replace(/[^\w\s]/gi, ""),
        });
      }
    });

    const result = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: conversationLog,
    });

    const text = result.data.choices?.[0]?.message?.content ?? "";

    message.channel.send(text);
  } catch (error) {
    console.error(`ERROR: ${error}`);
  }
});

client.login(process.env.TOKEN);
