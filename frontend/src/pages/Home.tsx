import { Component } from 'solid-js';
import { A } from '@solidjs/router';

const Home: Component = () => {
  return (
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-6">
        Link Your YouTube Music to Spotify
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-200 mb-8">
        Seamlessly transfer your playlists and favorite tracks between YouTube Music and Spotify
      </p>
      <div class="space-x-4">
        <A href="/login" class="btn btn-primary">
          Get Started
        </A>
        <A href="/about" class="btn btn-secondary">
          Learn More
        </A>
      </div>
    </div>
  );
};

export default Home; 