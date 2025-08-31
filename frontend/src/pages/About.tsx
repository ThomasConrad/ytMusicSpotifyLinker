import { Component, createSignal, onMount } from "solid-js";
import { A } from "@solidjs/router";

const About: Component = () => {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);

  onMount(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  });

  return (
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="card animate-zoom-in hover:shadow-lg transition-all duration-300">
        <h1 class="heading-1 text-center animate-fade-in">
          About YT Music Spotify Linker
        </h1>
        <p
          class="text-gray-600 dark:text-gray-200 text-lg mb-6 animate-slide-up"
          style={{ "animation-delay": "100ms" }}
        >
          A seamless way to transfer your playlists between YouTube Music and
          Spotify.
        </p>
      </div>

      <div class="grid gap-8 md:grid-cols-2">
        <div class="card">
          <h2 class="heading-2 mb-4">How It Works</h2>
          <div class="space-y-4">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span class="text-blue-600 dark:text-blue-300 font-bold">
                  1
                </span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-50">
                  Connect Your Accounts
                </h3>
                <p class="text-gray-600 dark:text-gray-200">
                  Link your YouTube Music and Spotify accounts securely.
                </p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span class="text-blue-600 dark:text-blue-300 font-bold">
                  2
                </span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-50">
                  Select Playlists
                </h3>
                <p class="text-gray-600 dark:text-gray-200">
                  Choose which playlists you want to transfer between services.
                </p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span class="text-blue-600 dark:text-blue-300 font-bold">
                  3
                </span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-50">
                  Transfer & Enjoy
                </h3>
                <p class="text-gray-600 dark:text-gray-200">
                  Your playlists will be transferred while maintaining song
                  order and metadata.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2 class="heading-2 mb-4">Features</h2>
          <ul class="space-y-4">
            <li class="flex items-start space-x-3">
              <svg
                class="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span class="text-gray-600 dark:text-gray-200">
                Bidirectional transfers between YouTube Music and Spotify
              </span>
            </li>
            <li class="flex items-start space-x-3">
              <svg
                class="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span class="text-gray-600 dark:text-gray-200">
                Preserves playlist order and metadata
              </span>
            </li>
            <li class="flex items-start space-x-3">
              <svg
                class="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span class="text-gray-600 dark:text-gray-200">
                Smart matching for different song versions
              </span>
            </li>
            <li class="flex items-start space-x-3">
              <svg
                class="h-6 w-6 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span class="text-gray-600 dark:text-gray-200">
                Secure authentication with OAuth
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="card">
        <h2 class="heading-2 mb-4">Get Started</h2>
        <p class="text-gray-600 dark:text-gray-200 mb-4">
          Ready to transfer your playlists?{" "}
          {isAuthenticated()
            ? "Head to your dashboard to get started."
            : "Create an account and connect your music services to get started."}
        </p>
        <div class="flex space-x-4">
          {isAuthenticated() ? (
            <A href="/dashboard" class="btn btn-primary">
              Go to Dashboard
            </A>
          ) : (
            <A href="/login" class="btn btn-primary">
              Login
            </A>
          )}
          <A href="/" class="btn btn-secondary">
            Back to Home
          </A>
        </div>
      </div>
    </div>
  );
};

export default About;
