import { create } from 'venom-bot'
import { ChatBot } from '../presentation/chat-bot'

create('chat-bot').then((client) => {
  const chatBot = new ChatBot(client)
  client.onAnyMessage((message) => {
    chatBot.onAnyMessage(message).catch((error) => {
      console.error('Error na função onAnyMessage da classe ChatBot --> ', error)
    })
  }).catch((error) => {
    console.error('Erro em onAnyMessage --> ', error)
  })
})
  .catch((erro) => {
    console.log(erro)
  })
