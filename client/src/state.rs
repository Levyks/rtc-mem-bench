use atomic_counter::{AtomicCounter, RelaxedCounter};
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::sync::Arc;
use tokio::time;

#[derive(Clone)]
pub struct State {
    rooms_created: Arc<RelaxedCounter>,
    clients_connected: Arc<RelaxedCounter>,
    loop_avg_sum: Arc<RelaxedCounter>,
    loop_avg_count: Arc<RelaxedCounter>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StateDump {
    pub rooms_created: usize,
    pub clients_connected: usize,
    pub loop_avg_sum: usize,
    pub loop_avg_count: usize,
    pub timestamp: DateTime<Utc>,
}

impl State {
    pub fn new() -> Self {
        Self {
            rooms_created: Arc::new(RelaxedCounter::new(0)),
            clients_connected: Arc::new(RelaxedCounter::new(0)),
            loop_avg_sum: Arc::new(RelaxedCounter::new(0)),
            loop_avg_count: Arc::new(RelaxedCounter::new(0)),
        }
    }

    pub fn register_loop_iteration(&self, duration: time::Duration) {
        self.loop_avg_sum.add(duration.as_micros() as usize);
        self.loop_avg_count.inc();
    }

    pub fn inc_clients_connected(&self) {
        self.clients_connected.inc();
    }

    pub fn inc_rooms_created(&self) {
        self.rooms_created.inc();
    }

    pub fn reset_loop_and_dump(&self) -> StateDump {
        StateDump {
            rooms_created: self.rooms_created.get(),
            clients_connected: self.clients_connected.get(),
            loop_avg_sum: self.loop_avg_sum.reset(),
            loop_avg_count: self.loop_avg_count.reset(),
            timestamp: Utc::now(),
        }
    }
}
