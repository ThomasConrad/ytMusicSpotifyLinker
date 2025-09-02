import { Component } from 'solid-js';

const About: Component = () => {
  return (
    <div class="max-w-4xl mx-auto py-8 space-y-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-6">
        About YT Music Spotify Linker
      </h1>
      
      <div class="prose dark:prose-invert max-w-none">
        <p class="text-lg text-gray-600 dark:text-gray-300 mb-6">
          YT Music Spotify Linker is a powerful tool that helps you seamlessly synchronize 
          your music playlists between YouTube Music and Spotify, eliminating the hassle 
          of manually recreating playlists across platforms.
        </p>

        <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Key Features
        </h2>
        
        <ul class="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mb-6">
          <li>Automatic playlist synchronization between YouTube Music and Spotify</li>
          <li>Smart song matching using advanced algorithms</li>
          <li>Preview sync changes before applying them</li>
          <li>Real-time sync monitoring and history</li>
          <li>Secure OAuth integration with both platforms</li>
          <li>Clean, modern interface with dark mode support</li>
        </ul>

        <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
          How It Works
        </h2>
        
        <ol class="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300 mb-6">
          <li>Connect your YouTube Music and Spotify accounts securely</li>
          <li>Create "watchers" to monitor specific playlists</li>
          <li>Preview what changes will be made before syncing</li>
          <li>Let the system automatically keep your playlists in sync</li>
        </ol>

        <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Privacy & Security
        </h2>
        
        <p class="text-gray-600 dark:text-gray-300">
          Your privacy is our priority. We use secure OAuth protocols to connect to your 
          music accounts and never store your passwords. All data is encrypted and your 
          playlist information is only used for synchronization purposes.
        </p>
      </div>
    </div>
  );
};

export default About;