use anyhow::{anyhow, Result};
use async_trait::async_trait;

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async, tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
};

use url::Url;

use crate::messages;
use crate::messages::{ClientMessage, ServerMessage};
use crate::transporters::Transport;

pub struct WsTransport {
    tx: SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
    rx: SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
}

#[async_trait]
impl Transport for WsTransport {
    async fn send_message(&mut self, message: &str) -> Result<()> {
        let message = ClientMessage::SendMessage(message.to_owned());
        let message_raw = serde_json::to_string(&message)?;
        self.tx.send(Message::Text(message_raw)).await?;
        Ok(())
    }

    async fn wait_for_message(&mut self) -> Result<messages::Message> {
        while let Some(result) = self.rx.next().await {
            let message = match result? {
                Message::Text(text) => text,
                _ => continue,
            };

            let parsed: ServerMessage = serde_json::from_str(&message)?;

            return match parsed {
                ServerMessage::Message(message) => Ok(message),
            };
        }

        Err(anyhow!("No message received"))
    }
}

pub async fn connect(base_url: &Url, username: &str, room: &str) -> Result<WsTransport> {
    let mut url = base_url.clone();

    url.set_scheme("ws")
        .map_err(|_| anyhow!("Cannot set scheme to ws"))?;

    url.query_pairs_mut()
        .append_pair("room", room)
        .append_pair("username", username);

    let (ws_stream, _) = connect_async(url).await?;

    let (tx, rx) = ws_stream.split();

    let client = WsTransport { tx, rx };

    Ok(client)
}
