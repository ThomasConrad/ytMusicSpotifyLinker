mod sled_repository_tests;
mod user_tests;

use crate::database::traits::ModelError;
use crate::database::models::User;
use crate::database::sled::{SledRepository, UserRepository};
use tempfile::tempdir;

// Re-export test modules
pub use sled_repository_tests::*;
pub use user_tests::*;

// Common test utilities
pub fn setup_test_db() -> (tempfile::TempDir, sled::Db) {
    let temp_dir = tempdir().unwrap();
    let db = sled::open(temp_dir.path()).unwrap();
    (temp_dir, db)
}

// Helper function to create a test user
pub fn create_test_user(repo: &UserRepository, username: &str, password: &str) -> User {
    repo.create_user(username.to_string(), password.to_string())
        .unwrap()
} 