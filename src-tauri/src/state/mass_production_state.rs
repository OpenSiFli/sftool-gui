use crate::types::{
    MassProductionPortInfo, MassProductionPortStatus, MassProductionSnapshot,
    MassProductionStartRequest,
};
use std::collections::{HashMap, HashSet, VecDeque};
use std::thread::JoinHandle;

pub struct MassProductionState {
    pub running: bool,
    pub pending_trigger_flash: bool,
    pub request: Option<MassProductionStartRequest>,
    pub ports: HashMap<String, MassProductionPortInfo>,
    pub queue: VecDeque<String>,
    pub active_ports: HashSet<String>,
    pub session_id: u64,
    pub started_at: Option<u64>,
    pub ended_at: Option<u64>,
    pub manual_stopped: bool,
    pub success_count: u32,
    pub failed_count: u32,
    pub supervisor_thread: Option<JoinHandle<()>>,
}

impl Default for MassProductionState {
    fn default() -> Self {
        Self {
            running: false,
            pending_trigger_flash: false,
            request: None,
            ports: HashMap::new(),
            queue: VecDeque::new(),
            active_ports: HashSet::new(),
            session_id: 0,
            started_at: None,
            ended_at: None,
            manual_stopped: false,
            success_count: 0,
            failed_count: 0,
            supervisor_thread: None,
        }
    }
}

impl MassProductionState {
    pub fn reset_for_start(
        &mut self,
        request: MassProductionStartRequest,
        session_id: u64,
        started_at: u64,
    ) {
        self.running = true;
        self.pending_trigger_flash = true;
        self.request = Some(request);
        self.ports.clear();
        self.queue.clear();
        self.active_ports.clear();
        self.session_id = session_id;
        self.started_at = Some(started_at);
        self.ended_at = None;
        self.manual_stopped = false;
        self.success_count = 0;
        self.failed_count = 0;
    }

    pub fn to_snapshot(&self) -> MassProductionSnapshot {
        let mut ports: Vec<MassProductionPortInfo> = self.ports.values().cloned().collect();
        ports.sort_by(|a, b| a.name.cmp(&b.name));

        let queued_count = ports
            .iter()
            .filter(|p| p.status == MassProductionPortStatus::Queued)
            .count() as u32;
        let active_count = ports
            .iter()
            .filter(|p| p.status == MassProductionPortStatus::Flashing)
            .count() as u32;

        let total_count = self
            .success_count
            .saturating_add(self.failed_count)
            .saturating_add(active_count)
            .saturating_add(queued_count);

        let is_enabled = self.running || !self.active_ports.is_empty();

        MassProductionSnapshot {
            is_running: self.running,
            is_enabled,
            session_id: self.session_id,
            started_at: self.started_at,
            ended_at: self.ended_at,
            manual_stopped: self.manual_stopped,
            chip_model: self.request.as_ref().map(|r| r.chip_model.clone()),
            memory_type: self.request.as_ref().map(|r| r.memory_type.clone()),
            auto_download: self
                .request
                .as_ref()
                .map(|r| r.auto_download)
                .unwrap_or(false),
            max_concurrency: self
                .request
                .as_ref()
                .map(|r| r.max_concurrency)
                .unwrap_or(8),
            queued_count,
            active_count,
            success_count: self.success_count,
            failed_count: self.failed_count,
            total_count,
            ports,
        }
    }
}
