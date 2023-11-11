# Rinha de comunicação real-time

## Objetivo

Comparar a performance/facilidade de implementação de diversas linguagens/frameworks diferentes para comunicação real-time.

## Especificação

No ato na conexão, o cliente deverá informar os parâmetros `username` e `room`, que serão utilizados para identificar o usuário e a sala que ele deseja entrar.

Para implementações baseadas em websockets "puro", os parâmetros deverão ser passados na query string da URL de conexão.

```
ws://example.com/ws?username=foo&room=bar
```

Para outros tipos de implementação, como Socket.IO ou Phoenix Channels, a maneira de passar os parâmetros pode variar, mas eles deverão ser passados no ato da conexão, ou, caso isso não seja possível, em uma mensagem enviada o mais rápido possível após a conexão ser estabelecida.

Em qualquer momento após a conexão, qualquer cliente pode enviar uma mensagem do tipo `sendMessage`, junto com uma string de texto como payload.

Para implementações baseadas em websockets "puro", a mensagem deverá ser enviada no formato JSON abaixo:

```json
{
  "type": "sendMessage",
  "payload": "Hello, world!"
}
```

Para outros tipos de implementação, como Socket.IO ou Phoenix Channels, a maneira de enviar a mensagem pode variar, porém, o identificador `sendMessage` deverá estar presente.

A mensagem então será transmitida para todos os clientes conectados na mesma sala, incluindo o cliente que enviou a mensagem, essa mensagem deverá ter o identificador `message` e o payload deverá ser no formato JSON abaixo

```json
{
  "username": "foo",
  "message": "Hello, world!",
  "timestamp": "2023-08-01T19:00:00Z"
}
```

Exemplo completo em WS:

```json
{
  "type": "message",
  "payload": {
    "username": "foo",
    "message": "Hello, world!",
    "timestamp": "2023-08-01T19:00:00Z"
  }
}
```

## Teste

Parâmetros:

- R: Número de salas
- C: Número de clientes por sala

O teste consiste em:

- Serão conectados C clientes em uma mesma sala X, de forma paralela, após a conexão bem sucedida de todos os C clientes, um dos clientes será escolhido como "líder" e o loop de envio de mensagens terá início, que consiste em o líder enviar uma mensagem e aguardar que todos os C clientes a recebem, esse processo será repetido indefinidamente e sem delay.

- Esse processo será repetido de forma sequencial até que todas as R salas tenham sido criadas e seus loops de envio de mensagens tenham sido iniciados.

### Métricas

- Tempo médio de conexão para todos os clientes de uma sala.
- Tempo médio de envio de mensagem para todos os clientes de uma sala / iterações do loop por segundo.
- Caso o servidor não "aguente" todos os C\*R clientes conectados simultaneamente, também será considerado quantos clientes conseguiram se conectar antes do servidor "cair".

### Limitações

A princípio, todos os servidores deverão ser testados em um container Docker com um limite de 512mb de RAM
