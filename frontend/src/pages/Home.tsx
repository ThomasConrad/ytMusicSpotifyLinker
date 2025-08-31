import { Component } from "solid-js";
import { A } from "@solidjs/router";

const Home: Component = () => {
  return (
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-6 animate-fade-in-slow transform transition-all duration-700 h">
        Link Your YouTube Music to Spotify
      </h1>
      <p
        class="text-xl text-gray-600 dark:text-gray-200 mb-8 animate-slide-up"
        style={{ "animation-delay": "200ms" }}
      >
        Seamlessly transfer your playlists and favorite tracks between YouTube
        Music and Spotify
      </p>
      <div
        class="space-x-4 animate-slide-up"
        style={{ "animation-delay": "400ms" }}
      >
        <A
          href="/login"
          class="btn btn-primary transform transition-all duration-300 "
        >
          Get Started
        </A>
        <A
          href="/about"
          class="btn btn-secondary transform transition-all duration-300 h hover:animate-float"
        >
          Learn More
        </A>
      </div>
    </div>
  );
};

export default Home;
