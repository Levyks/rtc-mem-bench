use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum ClientMessage {
    SendMessage(String),
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum ServerMessage {
    Message(Message),
}

#[derive(Deserialize, Debug)]
pub struct Message {
    pub username: String,
    pub message: String,
    pub timestamp: String,
}
