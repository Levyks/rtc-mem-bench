use crate::messages::Message;
use crate::transporters::{Transport, TransportType};
use anyhow::Result;
use url::Url;

pub struct Client {
    transport: Box<dyn Transport + Send>,
}

impl Client {
    fn new(transport: Box<dyn Transport + Send>) -> Self {
        Self { transport }
    }

    pub async fn connect(
        client_type: &TransportType,
        base_url: &Url,
        username: &str,
        room: &str,
    ) -> Result<Client> {
        let transport = client_type.connect(base_url, username, room).await?;
        Ok(Self::new(transport))
    }

    pub async fn send_message(&mut self, message: &str) -> Result<()> {
        self.transport.send_message(message).await
    }

    pub async fn wait_for_message(&mut self) -> Result<Message> {
        self.transport.wait_for_message().await
    }
}
