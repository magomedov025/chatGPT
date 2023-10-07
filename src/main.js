import { Telegraf, session } from 'telegraf'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { openai } from './openai.js'
const commands = `
/start - Перезапустить бота
/help - Помощь
/stop - Приостоновить бота
`

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.command('userInfo', async (ctx) => {
    ctx.session = INITIAL_SESSION
    console.log(ctx.message)
    await ctx.reply(`Hello ${ctx.message.from.first_name}`);
})


bot.use(session())

let instagram = {
    link: 'https://www.instagram.com/'
}



bot.command('new', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply(`Привет ${ctx.message.from.first_name}, приятно познакомиться. Меня зовут Ибрагим, и я создатель данного бота. Бот абсолютно бесплатный, поэтому буду призанателен, если подпишешься на мой инстаграм. ${instagram.link}`)
})


bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Жду вашего голосового или текстового сообщения');
    let objectTarif = ctx.message;
    objectTarif.tarif = 'personal'
    console.log(objectTarif)
})

bot.on(message('voice'), async ctx => {
    ctx.session ??= INITIAL_SESSION
    try{
        await ctx.reply(code('Сообщение принял. Жду ответа от сервера ...'))
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const userId = String(ctx.message.from.id)
        const oggPath = await ogg.create(link.href, userId)
        const mp3Path = await ogg.toMp3(oggPath, userId)


        const text = await openai.transcription(mp3Path)
        await ctx.reply(code(`Ваш запрос: ${text}`))

        ctx.session.messages.push({
            role: openai.roles.USER, 
            content: text,
        })

        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT, 
            content: response.content,
        })

        await ctx.reply(response.content)
    } catch (e){
        console.log(`Error while voice message`, e.message)
    }
})


bot.on(message('text'), async ctx => {
    ctx.session ??= INITIAL_SESSION
    try{
        await ctx.reply(code('Сообщение принял. Жду ответа от сервера ...'))

        ctx.session.messages.push({
            role: openai.roles.USER, 
            content: ctx.message.text,
        })

        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({
            role: openai.roles.ASSISTANT, 
            content: response.content,
        })

        await ctx.reply(response.content)
    } catch (e){
        console.log(`Error while voice message`, e.message)
    }
})



bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))