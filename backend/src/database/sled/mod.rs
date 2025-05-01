use super::traits::{DatabaseModel, ModelError, Repository};
use serde::{de::DeserializeOwned, Serialize};
use sled::Db;
use std::marker::PhantomData;

/// A base repository implementation using Sled
pub struct SledRepository<T: DatabaseModel> {
    db: Db,
    tree_name: String,
    _phantom: PhantomData<T>,
}

impl<T: DatabaseModel> SledRepository<T> {
    /// Create a new repository with the given database and tree name
    pub fn new(db: Db, tree_name: &str) -> Result<Self, ModelError> {
        // Ensure the tree exists
        db.open_tree(tree_name)?;
        Ok(Self {
            db,
            tree_name: tree_name.to_string(),
            _phantom: PhantomData,
        })
    }

    /// Get the tree for this repository
    fn tree(&self) -> Result<sled::Tree, ModelError> {
        Ok(self.db.open_tree(&self.tree_name)?)
    }

    /// Serialize a value to bytes
    fn serialize<V: Serialize>(&self, value: &V) -> Result<Vec<u8>, ModelError> {
        Ok(bincode::serialize(value)?)
    }

    /// Deserialize bytes to a value
    fn deserialize<V: DeserializeOwned>(&self, bytes: &[u8]) -> Result<V, ModelError> {
        Ok(bincode::deserialize(bytes)?)
    }
}

impl<T: DatabaseModel> Repository<T> for SledRepository<T> {
    fn get(&self, id: &T::Id) -> Result<Option<T>, ModelError> {
        let tree = self.tree()?;
        let key = self.serialize(id)?;
        
        if let Some(bytes) = tree.get(key)? {
            Ok(Some(self.deserialize(&bytes)?))
        } else {
            Ok(None)
        }
    }

    fn insert(&self, model: &T) -> Result<(), ModelError> {
        let tree = self.tree()?;
        let key = self.serialize(model.id())?;
        let value = self.serialize(model)?;
        
        tree.insert(key, value)?;
        Ok(())
    }

    fn update(&self, model: &T) -> Result<(), ModelError> {
        self.insert(model)
    }

    fn delete(&self, id: &T::Id) -> Result<(), ModelError> {
        let tree = self.tree()?;
        let key = self.serialize(id)?;
        
        tree.remove(key)?;
        Ok(())
    }

    fn list(&self) -> Result<Vec<T>, ModelError> {
        let tree = self.tree()?;
        let mut models = Vec::new();
        
        for result in tree.iter() {
            let (_, value) = result?;
            let model = self.deserialize(&value)?;
            models.push(model);
        }
        
        Ok(models)
    }
} 