#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;
mod utils;

use tauri::{
    menu::{Menu, MenuItem},
    SystemTray, SystemTrayEvent, SystemTrayMenu,
};
use std::sync::Arc;
use tokio::sync::Mutex;

/**
 * Application state
 */
pub struct AppState {
    db: Arc<Mutex<Option<sqlx::SqlitePool>>>,
}

/**
 * Main application entry point
 */
#[tauri::command]
async fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/**
 * Get device info
 */
#[tauri::command]
async fn get_device_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "hostname": hostname::get()
            .unwrap_or_default()
            .into_string()
            .unwrap_or_else(|_| "unknown".to_string()),
    }))
}

/**
 * Initialize database
 */
async fn init_db() -> Result<sqlx::SqlitePool, sqlx::Error> {
    let database_url = "sqlite:./priorio.db";

    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_logs (
            id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            started_at TIMESTAMP NOT NULL,
            completed_at TIMESTAMP,
            status TEXT NOT NULL,
            error_message TEXT
        )
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

/**
 * Setup system tray
 */
fn setup_tray() -> SystemTray {
    let tray_menu = SystemTrayMenu::new()
        .add_item(MenuItem::new("Show", "show"))
        .add_item(MenuItem::new("Sync", "sync"))
        .add_native_item(tauri::menu::PredefinedMenuItem::Separator)
        .add_item(MenuItem::new("Preferences", "preferences"))
        .add_native_item(tauri::menu::PredefinedMenuItem::Separator)
        .add_item(MenuItem::new("Quit", "quit"));

    SystemTray::new().with_menu(tray_menu)
}

/**
 * Handle system tray events
 */
fn handle_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "show" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "sync" => {
                    // Trigger sync
                    if let Some(window) = app.get_window("main") {
                        let _ = window.emit("trigger-sync", ());
                    }
                }
                "preferences" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.emit("open-settings", ());
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        }
        SystemTrayEvent::LeftClick {
            position: _,
            size: _,
            ..
        } => {
            if let Some(window) = app.get_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        _ => {}
    }
}

/**
 * Main function
 */
fn main() {
    let ctx = tauri::generate_context!();

    tauri::Builder::default()
        .menu(Menu::default())
        .system_tray(setup_tray())
        .on_system_tray_event(handle_tray_event)
        .manage(AppState {
            db: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_device_info,
            commands::sync::start_sync,
            commands::sync::get_sync_status,
            commands::sync::cancel_sync,
            commands::device::register_device,
            commands::device::get_devices,
            commands::device::update_device,
            commands::notification::send_notification,
            commands::notification::get_notifications,
            commands::file::pick_file,
            commands::file::pick_directory,
            commands::file::read_file,
            commands::file::write_file,
            commands::ipc::send_message,
            commands::ipc::receive_message,
        ])
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match init_db().await {
                    Ok(pool) => {
                        println!("Database initialized successfully");
                        // Store pool in app state if needed
                    }
                    Err(e) => {
                        eprintln!("Failed to initialize database: {}", e);
                    }
                }
            });

            Ok(())
        })
        .run(ctx)
        .expect("error while running tauri application");
}
