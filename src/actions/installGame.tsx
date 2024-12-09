import type { MenuItem } from '@devvit/public-api';

import { LoadingState } from '../components/LoadingState.js';
import { Devvit } from '@devvit/public-api';


import { Service } from '../service/service.js';
import Settings from '../settings.json';

export const installGame: MenuItem = {
  label: 'install photodecode  game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { ui, reddit } = context;
    const service = new Service(context);
    const community = await reddit.getCurrentSubreddit();

    // Create a pinned post
    const post = await reddit.submitPost({
      title: Settings.pinnedPost.title,
      subredditName: community.name,
      preview: <LoadingState />,
      
    });

    await Promise.all([
      // Pin the post
      post.sticky(),
      // Store the post data
      service.savePinnedPost(post.id),
      // Store the game settings
      service.storeGameSettings({
        subredditName: community.name,
        selectedDictionary: 'main',
      }),
      
    ]);

    ui.navigateTo(post);
    ui.showToast('Installed Photodecode!');
  },
};