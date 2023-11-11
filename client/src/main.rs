use crate::args::{parse_args, Args};
use crate::client::Client;
use crate::state::State;
use futures_util::future::try_join_all;
use nanoid::nanoid;
use std::future::Future;
use tokio::time;

mod args;
mod client;
mod messages;
mod state;
mod transporters;

#[tokio::main]
async fn main() {
    let args = parse_args().expect("Failed to parse args");

    let state = State::new();

    let mut handles = Vec::with_capacity((args.number_of_rooms + 1) as usize);

    handles.push(tokio::spawn(create_logger(
        state.clone(),
        time::Duration::from_secs(1),
    )));

    for i in 0..args.number_of_rooms {
        let room_name = format!("{}-{}", nanoid!(6), i);
        let clients = connect_clients(&args, &room_name, state.clone())
            .await
            .expect("Failed to connect clients");

        state.inc_rooms_created();

        let cloned_state = state.clone();

        handles.push(tokio::spawn(async move {
            room_loop(clients, args.loop_delay, cloned_state).await
        }));
    }

    let futures = handles.into_iter().map(move |handle| async {
        handle
            .await
            .map_err(|err| anyhow::anyhow!(err))
            .and_then(|res| res)
    });

    try_join_all(futures).await.unwrap();
}

async fn connect_clients(args: &Args, room: &str, state: State) -> anyhow::Result<Vec<Client>> {
    let mut clients = Vec::new();

    for i in 0..args.number_of_clients_per_room {
        let username = format!("player-{}", i);
        let client = Client::connect(&args.transport, &args.url, &username, room).await?;
        clients.push(client);
        state.inc_clients_connected();
        time::sleep(time::Duration::from_millis(args.delay_per_client)).await;
    }

    Ok(clients)
}

async fn room_loop(mut clients: Vec<Client>, delay: u64, state: State) -> anyhow::Result<()> {
    loop {
        let sender = clients
            .first_mut()
            .ok_or(anyhow::anyhow!("No clients in room"))?;

        let now = time::Instant::now();

        sender.send_message("Hello world!").await?;
        let mut futures = Vec::new();
        for client in &mut clients {
            let future = client.wait_for_message();
            futures.push(future);
        }

        try_join_all(futures).await?;

        state.register_loop_iteration(now.elapsed());

        time::sleep(time::Duration::from_millis(delay)).await;
    }
}

fn create_logger(
    state: State,
    interval: time::Duration,
) -> impl Future<Output = anyhow::Result<()>> {
    async move {
        loop {
            let dump = state.reset_loop_and_dump();
            println!("{}", serde_json::to_string(&dump)?);
            time::sleep(interval).await;
        }
    }
}
