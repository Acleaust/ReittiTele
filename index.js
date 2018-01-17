const TeleBot = require('telebot');
const bot = new TeleBot('BotToken'); //'BotToken'

//

bot.on(['/start', '/hello'], (msg) => msg.reply.text('Moro!')); //Testi


bot.start();