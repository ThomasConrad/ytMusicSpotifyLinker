use askama::Template;
use axum::{
    extract::Query,
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
    routing::{get, post},
    Form, Json, Router,
};
use axum_messages::{Message, Messages};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use time::OffsetDateTime;

use crate::users::{
    database::{Database, DatabaseOperations},
    AuthSession, Credentials,
};

#[derive(Clone)]
pub struct AuthState {
    db: Database,
}

impl AuthState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            db: Database::new(pool),
        }
    }
}

#[derive(Template)]
#[template(path = "login.html")]
pub struct LoginTemplate {
    messages: Vec<Message>,
    next: Option<String>,
}

// This allows us to extract the "next" field from the query string. We use this
// to redirect after log in.
#[derive(Debug, Deserialize)]
pub struct NextUrl {
    next: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    username: String,
    password: String,
}

// JSON API DTOs for authentication
#[derive(Debug, Deserialize)]
pub struct JsonLoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
pub struct JsonRegisterRequest {
    username: String,
    password: String,
}

#[derive(Debug, Serialize)]
pub struct JsonLoginResponse {
    success: bool,
    message: String,
    user: Option<UserProfileResponse>,
}

#[derive(Debug, Serialize)]
pub struct JsonRegisterResponse {
    success: bool,
    message: String,
    user: Option<UserProfileResponse>,
}

#[derive(Debug, Serialize)]
pub struct JsonLogoutResponse {
    success: bool,
    message: String,
}

#[derive(Debug, Serialize)]
pub struct UserProfileResponse {
    id: i64,
    username: String,
    created_at: Option<OffsetDateTime>,
}

#[derive(Debug, Serialize)]
pub struct JsonErrorResponse {
    success: bool,
    error: String,
    error_code: Option<String>,
}

pub fn router(pool: SqlitePool) -> Router<()> {
    let state = AuthState::new(pool);
    Router::new()
        // HTML form-based routes (existing)
        .route("/login", post(self::post::login))
        .route("/login", get(self::get::login))
        .route("/logout", get(self::get::logout))
        .route("/register", post(self::post::register))
        // JSON API routes (new)
        .route("/api/auth/login", post(self::json::login))
        .route("/api/auth/register", post(self::json::register))
        .route("/api/auth/logout", post(self::json::logout))
        .route("/api/auth/profile", get(self::json::profile))
        .with_state(state)
}

mod post {
    use super::*;
    use axum::extract::State;

    pub async fn register(
        State(state): State<AuthState>,
        Json(creds): Json<RegisterRequest>,
    ) -> Result<impl IntoResponse, StatusCode> {
        match state.db.create_user(&creds.username, &creds.password).await {
            Ok(_) => Ok(StatusCode::CREATED),
            Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
        }
    }

    pub async fn login(
        mut auth_session: AuthSession,
        messages: Messages,
        Form(creds): Form<Credentials>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let user = match auth_session.authenticate(creds.clone()).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                messages.error("Invalid credentials");

                let mut login_url = "/login".to_string();
                if let Some(next) = creds.next {
                    login_url = format!("{}?next={}", login_url, next);
                };

                return Ok(Redirect::to(&login_url).into_response());
            }
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        };

        if auth_session.login(&user).await.is_err() {
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }

        messages.success(format!("Successfully logged in as {}", user.username));

        Ok(if let Some(next) = creds.next {
            Redirect::to(&next)
        } else {
            Redirect::to("/")
        }
        .into_response())
    }
}

mod get {
    use super::*;

    pub async fn login(
        messages: Messages,
        Query(NextUrl { next }): Query<NextUrl>,
    ) -> Result<Html<String>, StatusCode> {
        let template = LoginTemplate {
            messages: messages.into_iter().collect(),
            next,
        };
        template
            .render()
            .map(Html)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
    }

    pub async fn logout(mut auth_session: AuthSession) -> Result<impl IntoResponse, StatusCode> {
        if auth_session.logout().await.is_err() {
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
        Ok(Redirect::to("/login").into_response())
    }
}

mod json {
    use super::*;
    use axum::extract::State;

    pub async fn login(
        mut auth_session: AuthSession,
        State(_state): State<AuthState>,
        Json(creds): Json<JsonLoginRequest>,
    ) -> Result<impl IntoResponse, StatusCode> {
        // Create credentials for the existing auth system
        let credentials = Credentials {
            username: creds.username,
            password: creds.password,
            next: None,
        };

        match auth_session.authenticate(credentials).await {
            Ok(Some(user)) => {
                // Login the user
                if auth_session.login(&user).await.is_err() {
                    return Ok(Json(JsonErrorResponse {
                        success: false,
                        error: "Failed to create session".to_string(),
                        error_code: Some("SESSION_ERROR".to_string()),
                    }).into_response());
                }

                // Return success response with user profile
                Ok(Json(JsonLoginResponse {
                    success: true,
                    message: format!("Successfully logged in as {}", user.username),
                    user: Some(UserProfileResponse {
                        id: user.id,
                        username: user.username,
                        created_at: None, // TODO: Add created_at field to User model
                    }),
                }).into_response())
            }
            Ok(None) => {
                // Invalid credentials
                Ok(Json(JsonErrorResponse {
                    success: false,
                    error: "Invalid username or password".to_string(),
                    error_code: Some("INVALID_CREDENTIALS".to_string()),
                }).into_response())
            }
            Err(_) => {
                // Internal error
                Ok(Json(JsonErrorResponse {
                    success: false,
                    error: "Internal server error during authentication".to_string(),
                    error_code: Some("AUTH_ERROR".to_string()),
                }).into_response())
            }
        }
    }

    pub async fn register(
        mut auth_session: AuthSession,
        State(state): State<AuthState>,
        Json(creds): Json<JsonRegisterRequest>,
    ) -> Result<impl IntoResponse, StatusCode> {
        // Validate input
        if creds.username.trim().is_empty() {
            return Ok(Json(JsonErrorResponse {
                success: false,
                error: "Username cannot be empty".to_string(),
                error_code: Some("INVALID_USERNAME".to_string()),
            }).into_response());
        }

        if creds.password.len() < 6 {
            return Ok(Json(JsonErrorResponse {
                success: false,
                error: "Password must be at least 6 characters long".to_string(),
                error_code: Some("WEAK_PASSWORD".to_string()),
            }).into_response());
        }

        // Create the user
        match state.db.create_user(&creds.username, &creds.password).await {
            Ok(user) => {
                // Auto-login the new user
                if let Err(_) = auth_session.login(&user).await {
                    return Ok(Json(JsonErrorResponse {
                        success: false,
                        error: "User created but failed to log in".to_string(),
                        error_code: Some("SESSION_ERROR".to_string()),
                    }).into_response());
                }

                // Return success response
                Ok(Json(JsonRegisterResponse {
                    success: true,
                    message: format!("Account created successfully for {}", user.username),
                    user: Some(UserProfileResponse {
                        id: user.id,
                        username: user.username,
                        created_at: None, // TODO: Add created_at field to User model
                    }),
                }).into_response())
            }
            Err(e) => {
                // Handle specific error cases
                let error_message = if e.to_string().contains("UNIQUE constraint failed") {
                    "Username already exists".to_string()
                } else {
                    "Failed to create account".to_string()
                };

                Ok(Json(JsonErrorResponse {
                    success: false,
                    error: error_message,
                    error_code: Some("REGISTRATION_FAILED".to_string()),
                }).into_response())
            }
        }
    }

    pub async fn logout(mut auth_session: AuthSession) -> Result<impl IntoResponse, StatusCode> {
        if auth_session.logout().await.is_err() {
            return Ok(Json(JsonErrorResponse {
                success: false,
                error: "Failed to logout".to_string(),
                error_code: Some("LOGOUT_ERROR".to_string()),
            }).into_response());
        }

        Ok(Json(JsonLogoutResponse {
            success: true,
            message: "Successfully logged out".to_string(),
        }).into_response())
    }

    pub async fn profile(auth_session: AuthSession) -> Result<impl IntoResponse, StatusCode> {
        match auth_session.user {
            Some(user) => {
                Ok(Json(UserProfileResponse {
                    id: user.id,
                    username: user.username,
                    created_at: None, // TODO: Add created_at field to User model
                }).into_response())
            }
            None => {
                Err(StatusCode::UNAUTHORIZED)
            }
        }
    }
}
