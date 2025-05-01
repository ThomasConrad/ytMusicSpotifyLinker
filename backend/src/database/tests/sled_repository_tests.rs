use super::*;
use crate::database::{
    models::User,
    sled::{SledRepository, UserRepository},
    traits::{DatabaseModel, Repository},
};
use tempfile::tempdir;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct TestModel {
    id: i64,
    value: String,
}

impl DatabaseModel for TestModel {
    type Id = i64;

    fn id(&self) -> &Self::Id {
        &self.id
    }
}

fn setup_test_db() -> (tempfile::TempDir, sled::Db) {
    let temp_dir = tempdir().unwrap();
    let db = sled::open(temp_dir.path()).unwrap();
    (temp_dir, db)
}

#[test]
fn test_sled_repository_basic_operations() {
    let (_temp_dir, db) = setup_test_db();
    let repo = SledRepository::<TestModel>::new(db, "test_models").unwrap();

    // Test insert
    let model = TestModel {
        id: 1,
        value: "test".to_string(),
    };
    repo.insert(&model).unwrap();

    // Test get
    let retrieved = repo.get(&1).unwrap().unwrap();
    assert_eq!(retrieved.id, 1);
    assert_eq!(retrieved.value, "test");

    // Test update
    let updated = TestModel {
        id: 1,
        value: "updated".to_string(),
    };
    repo.update(&updated).unwrap();
    let retrieved = repo.get(&1).unwrap().unwrap();
    assert_eq!(retrieved.value, "updated");

    // Test delete
    repo.delete(&1).unwrap();
    assert!(repo.get(&1).unwrap().is_none());

    // Test list
    let model1 = TestModel {
        id: 1,
        value: "test1".to_string(),
    };
    let model2 = TestModel {
        id: 2,
        value: "test2".to_string(),
    };
    repo.insert(&model1).unwrap();
    repo.insert(&model2).unwrap();
    let models = repo.list().unwrap();
    assert_eq!(models.len(), 2);
    assert!(models.iter().any(|m| m.id == 1 && m.value == "test1"));
    assert!(models.iter().any(|m| m.id == 2 && m.value == "test2"));
}

#[test]
fn test_user_repository_operations() {
    let (_temp_dir, db) = setup_test_db();
    let repo = UserRepository::new(db).unwrap();

    // Test create user
    let user = repo
        .create_user("test_user".to_string(), "password123".to_string())
        .unwrap();
    assert_eq!(user.id(), &1);
    assert_eq!(user.username(), "test_user");

    // Test get by username
    let retrieved = repo.get_by_username("test_user").unwrap().unwrap();
    assert_eq!(retrieved.id(), &1);
    assert_eq!(retrieved.username(), "test_user");

    // Test duplicate username
    let result = repo.create_user("test_user".to_string(), "password456".to_string());
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        crate::database::traits::ModelError::InvalidData(_)
    ));

    // Test get by id
    let retrieved = repo.get(&1).unwrap().unwrap();
    assert_eq!(retrieved.id(), &1);
    assert_eq!(retrieved.username(), "test_user");

    // Test update
    let mut updated = retrieved.clone();
    updated.update(&User::with_credentials(
        1,
        "new_username".to_string(),
        "new_password".to_string(),
    ));
    repo.update(&updated).unwrap();
    let retrieved = repo.get(&1).unwrap().unwrap();
    assert_eq!(retrieved.username(), "new_username");

    // Test delete
    repo.delete(&1).unwrap();
    assert!(repo.get(&1).unwrap().is_none());
    assert!(repo.get_by_username("new_username").unwrap().is_none());

    // Test list
    let user1 = repo
        .create_user("user1".to_string(), "pass1".to_string())
        .unwrap();
    let user2 = repo
        .create_user("user2".to_string(), "pass2".to_string())
        .unwrap();
    let users = repo.list().unwrap();
    assert_eq!(users.len(), 2);
    assert!(users.iter().any(|u| u.id() == &1 && u.username() == "user1"));
    assert!(users.iter().any(|u| u.id() == &2 && u.username() == "user2"));
} 