import { Component } from 'solid-js';
import { A } from '@solidjs/router';
import { Button } from '@/components/ui';

const Home: Component = () => {
  return (
    <div class="text-center py-16">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-6 animate-fade-in-slow">
        Link Your YouTube Music to Spotify
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-200 mb-8 animate-slide-up max-w-2xl mx-auto">
        Seamlessly transfer your playlists and favorite tracks between YouTube
        Music and Spotify
      </p>
      <div class="space-x-4 animate-slide-up">
        <A href="/login">
          <Button variant="primary" size="lg">
            Get Started
          </Button>
        </A>
        <A href="/about">
          <Button variant="secondary" size="lg">
            Learn More
          </Button>
        </A>
      </div>
    </div>
  );
};

export default Home;
