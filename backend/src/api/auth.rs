use askama::Template;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{Html, IntoResponse, Redirect},
    routing::{get, post},
    Form, Json, Router,
};
use axum_messages::{Message, Messages};
use serde::Deserialize;
use sqlx::SqlitePool;

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

pub fn router(pool: SqlitePool) -> Router<()> {
    let state = AuthState::new(pool);
    Router::new()
        .route("/login", post(self::post::login))
        .route("/login", get(self::get::login))
        .route("/logout", get(self::get::logout))
        .route("/register", post(self::post::register))
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
