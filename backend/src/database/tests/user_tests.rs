use super::*;
use crate::database::models::User;

#[test]
fn test_user_creation() {
    let user = User::with_credentials(1, "test_user".to_string(), "password123".to_string());
    
    assert_eq!(user.id(), &1);
    assert_eq!(user.username(), "test_user");
    assert_eq!(user.password_hash(), "password123");
}

#[test]
fn test_user_creatable() {
    let user = User::new(1);
    
    assert_eq!(user.id(), &1);
    assert_eq!(user.username(), "");
    assert_eq!(user.password_hash(), "");
}

#[test]
fn test_user_update() {
    let mut user = User::new(1);
    let other = User::with_credentials(1, "test_user".to_string(), "password123".to_string());
    
    user.update(&other);
    
    assert_eq!(user.id(), &1);
    assert_eq!(user.username(), "test_user");
    assert_eq!(user.password_hash(), "password123");
}

#[test]
fn test_user_password_verification() {
    let user = User::with_credentials(1, "test_user".to_string(), "password123".to_string());
    
    // This is a simple test - in reality, we'd want to test with proper password hashing
    assert!(user.verify_password("password123").unwrap());
    assert!(!user.verify_password("wrongpassword").unwrap());
}

#[test]
fn test_user_debug_implementation() {
    let user = User::with_credentials(1, "test_user".to_string(), "password123".to_string());
    let debug_output = format!("{:?}", user);
    
    assert!(debug_output.contains("id: 1"));
    assert!(debug_output.contains("username: \"test_user\""));
    assert!(debug_output.contains("password: \"[redacted]\""));
    assert!(!debug_output.contains("password123"));
} 