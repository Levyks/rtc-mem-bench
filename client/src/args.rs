use crate::transporters::TransportType;
use anyhow::{anyhow, Result};
use url::Url;

pub struct Args {
    pub transport: TransportType,
    pub url: Url,
    pub number_of_rooms: u32,
    pub number_of_clients_per_room: u32,
    pub loop_delay: u64,
}

pub fn parse_args() -> Result<Args> {
    let args = std::env::args().collect::<Vec<_>>();

    if args.len() != 6 {
        return Err(anyhow!(
            "Usage: {} <transport> <url> <number_of_rooms> <number_of_clients_per_room> <loop_delay>",
            args[0]
        ));
    }

    Ok(Args {
        transport: args[1].parse::<TransportType>()?,
        url: parse_url(&args[2])?,
        number_of_rooms: args[3].parse::<u32>()?,
        number_of_clients_per_room: args[4].parse::<u32>()?,
        loop_delay: args[5].parse::<u64>()?,
    })
}

pub fn parse_url(url: &str) -> Result<Url> {
    if !url.contains("://") {
        return Ok(format!("http://{}", url).parse::<Url>()?);
    };
    Ok(url.parse::<Url>()?)
}
