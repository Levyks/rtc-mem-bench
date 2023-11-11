pub mod ws;

use crate::messages::Message;
use anyhow::{anyhow, Error, Result};
use async_trait::async_trait;
use std::str::FromStr;
use url::Url;

#[async_trait]
pub trait Transport {
    async fn send_message(&mut self, message: &str) -> Result<()>;
    async fn wait_for_message(&mut self) -> Result<Message>;
}

#[derive(Debug, Clone)]
pub enum TransportType {
    Ws,
}

impl FromStr for TransportType {
    type Err = Error;

    fn from_str(s: &str) -> Result<Self> {
        match s {
            "ws" => Ok(Self::Ws),
            _ => Err(anyhow!("Unknown transport type: {}", s)),
        }
    }
}

impl TransportType {
    pub async fn connect(
        &self,
        base_url: &Url,
        username: &str,
        room: &str,
    ) -> Result<Box<dyn Transport + Send>> {
        Ok(match self {
            TransportType::Ws => Box::new(ws::connect(base_url, username, room).await?),
        })
    }
}
