import { Component, Show, For, createSignal, createEffect, onMount } from 'solid-js';
import { LoadingSpinner, Button, Input } from '@/components/ui';
import { useUser } from '@/contexts/UserContext';
import { SpotifyPlaylist } from '@/types';

export interface SpotifyPlaylistSelectorProps {
  onSelect: (playlist: SpotifyPlaylist) => void;
  selectedPlaylistId?: string;
  multiSelect?: boolean;
  onMultiSelect?: (playlists: SpotifyPlaylist[]) => void;
  filterOwned?: boolean;
  showCreateOption?: boolean;
  onCreatePlaylist?: (name: string) => void;
}

export const SpotifyPlaylistSelector: Component<SpotifyPlaylistSelectorProps> = (props) => {
  const userContext = useUser();
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedPlaylists, setSelectedPlaylists] = createSignal<string[]>([]);
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [newPlaylistName, setNewPlaylistName] = createSignal('');
  const [isCreating, setIsCreating] = createSignal(false);

  // Load playlists when component mounts
  onMount(() => {
    if (userContext.spotifyConnectionStatus().connected && userContext.spotifyPlaylists().length === 0) {
      userContext.loadSpotifyPlaylists();
    }
  });

  // Initialize selected playlists
  createEffect(() => {
    if (props.selectedPlaylistId && !props.multiSelect) {
      setSelectedPlaylists([props.selectedPlaylistId]);
    }
  });

  const filteredPlaylists = () => {
    let playlists = userContext.spotifyPlaylists();
    
    // Filter by ownership if requested
    if (props.filterOwned) {
      const currentUser = userContext.spotifyConnectionStatus().username;
      playlists = playlists.filter(playlist => playlist.owner_id === currentUser);
    }

    // Filter by search term
    if (searchTerm().trim()) {
      const term = searchTerm().toLowerCase();
      playlists = playlists.filter(playlist => 
        playlist.name.toLowerCase().includes(term) ||
        playlist.description?.toLowerCase().includes(term)
      );
    }

    return playlists;
  };

  const handlePlaylistClick = (playlist: SpotifyPlaylist) => {
    if (props.multiSelect) {
      const currentSelected = selectedPlaylists();
      const isSelected = currentSelected.includes(playlist.id);
      
      let newSelected: string[];
      if (isSelected) {
        newSelected = currentSelected.filter(id => id !== playlist.id);
      } else {
        newSelected = [...currentSelected, playlist.id];
      }
      
      setSelectedPlaylists(newSelected);
      
      if (props.onMultiSelect) {
        const selectedPlaylistObjects = userContext.spotifyPlaylists()
          .filter(p => newSelected.includes(p.id));
        props.onMultiSelect(selectedPlaylistObjects);
      }
    } else {
      setSelectedPlaylists([playlist.id]);
      props.onSelect(playlist);
    }
  };

  const handleCreatePlaylist = async () => {
    const name = newPlaylistName().trim();
    if (!name || !props.onCreatePlaylist) return;

    setIsCreating(true);
    try {
      await props.onCreatePlaylist(name);
      setNewPlaylistName('');
      setShowCreateForm(false);
      // Refresh playlists after creation
      userContext.loadSpotifyPlaylists();
    } finally {
      setIsCreating(false);
    }
  };

  const formatTrackCount = (count: number) => {
    return `${count} ${count === 1 ? 'track' : 'tracks'}`;
  };

  const formatOwner = (ownerId: string, ownerName?: string) => {
    const currentUser = userContext.spotifyConnectionStatus().username;
    if (ownerId === currentUser) {
      return 'You';
    }
    return ownerName || ownerId;
  };

  return (
    <div class="space-y-4">
      {/* Header with search and create option */}
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <Input
            placeholder="Search playlists..."
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
            class="w-full"
          />
        </div>
        
        <Show when={props.showCreateOption}>
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(!showCreateForm())}
          >
            Create New
          </Button>
        </Show>
      </div>

      {/* Create playlist form */}
      <Show when={showCreateForm()}>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-50">
            Create New Playlist
          </h3>
          <div class="flex gap-3">
            <Input
              placeholder="Playlist name..."
              value={newPlaylistName()}
              onInput={(e) => setNewPlaylistName(e.currentTarget.value)}
              class="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePlaylist();
                }
              }}
            />
            <Button
              variant="primary"
              onClick={handleCreatePlaylist}
              loading={isCreating()}
              disabled={!newPlaylistName().trim()}
            >
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateForm(false);
                setNewPlaylistName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Show>

      {/* Connection status check */}
      <Show when={!userContext.spotifyConnectionStatus().connected}>
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="mb-4">Connect your Spotify account to view playlists</p>
          <Button
            variant="primary"
            onClick={() => userContext.connectSpotify()}
          >
            Connect Spotify
          </Button>
        </div>
      </Show>

      {/* Loading state */}
      <Show when={userContext.spotifyConnectionStatus().connected && userContext.isLoadingSpotifyPlaylists()}>
        <div class="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span class="ml-3 text-gray-500 dark:text-gray-400">Loading playlists...</span>
        </div>
      </Show>

      {/* Error state */}
      <Show when={userContext.spotifyError()}>
        <div class="text-center py-8">
          <div class="text-red-600 dark:text-red-400 mb-4">
            {userContext.spotifyError()}
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              userContext.retrySpotify();
              userContext.loadSpotifyPlaylists();
            }}
          >
            Retry
          </Button>
        </div>
      </Show>

      {/* Playlist grid */}
      <Show when={userContext.spotifyConnectionStatus().connected && !userContext.isLoadingSpotifyPlaylists() && !userContext.spotifyError()}>
        <Show 
          when={filteredPlaylists().length > 0}
          fallback={
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
              <Show
                when={searchTerm().trim()}
                fallback={<p>No playlists found</p>}
              >
                <p>No playlists match "{searchTerm()}"</p>
              </Show>
            </div>
          }
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={filteredPlaylists()}>
              {(playlist) => {
                const isSelected = () => selectedPlaylists().includes(playlist.id);
                
                return (
                  <div
                    class={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected()
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => handlePlaylistClick(playlist)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePlaylistClick(playlist);
                      }
                    }}
                  >
                    <div class="flex items-start space-x-3">
                      {/* Playlist image or placeholder */}
                      <div class="flex-shrink-0">
                        <Show 
                          when={playlist.image_url}
                          fallback={
                            <div class="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                              <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                              </svg>
                            </div>
                          }
                        >
                          <img
                            src={playlist.image_url}
                            alt={playlist.name}
                            class="w-12 h-12 rounded object-cover"
                          />
                        </Show>
                      </div>

                      {/* Playlist info */}
                      <div class="flex-1 min-w-0">
                        <h3 class={`font-medium truncate ${
                          isSelected() 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-gray-900 dark:text-gray-50'
                        }`}>
                          {playlist.name}
                        </h3>
                        
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          by {formatOwner(playlist.owner_id, playlist.owner_name)}
                        </p>
                        
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {formatTrackCount(playlist.track_count)}
                        </p>

                        <Show when={playlist.description}>
                          <p class="text-sm text-gray-400 dark:text-gray-500 truncate mt-1">
                            {playlist.description}
                          </p>
                        </Show>
                        
                        <div class="flex items-center mt-2 space-x-2">
                          <Show when={playlist.public}>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Public
                            </span>
                          </Show>
                          
                          <Show when={playlist.collaborative}>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Collaborative
                            </span>
                          </Show>
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <Show when={isSelected()}>
                        <div class="flex-shrink-0">
                          <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </Show>

      {/* Selection summary for multi-select */}
      <Show when={props.multiSelect && selectedPlaylists().length > 0}>
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            {selectedPlaylists().length} playlist{selectedPlaylists().length === 1 ? '' : 's'} selected
          </p>
        </div>
      </Show>
    </div>
  );
};