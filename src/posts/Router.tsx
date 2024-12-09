
import type { Context } from '@devvit/public-api';
import { Devvit, useAsync } from '@devvit/public-api';

import { LoadingState } from '../components/LoadingState.js';
import { Service } from '../service/service.js';
import { ImagePost } from './imagespost/ImagePost.js';

import type { GameSettings } from '../types/GameSettings.js';
import type {
    CollectionData,
    CollectionPostData,
    ImagePostData,
    PinnedPostData,
  } from '../types/PostData.js';
import { UserData } from '../types/UserData.js';

import { PinnedPost } from './PinnedPost/PinnedPost.js';

/*
 * Page Router
 *
 * This is the post type router and the main entry point for the custom post.
 * It handles the initial data loading and routing to the correct page based on the post type.
 */

export const Router: Devvit.CustomPostComponent = (context: Context) => {
  const service = new Service(context);

  const { data: username, loading: usernameLoading } = useAsync(
    async () => {
      if (!context.userId) return null; // Return early if no userId
      const cacheKey = 'cache:userId-username-pdg';
      const cache = await context.redis.hGet(cacheKey, context.userId);
      if (cache) {
        return cache;
      } else {
        const user = await context.reddit.getUserById(context.userId);
        if (user) {
          await context.redis.hSet(cacheKey, {
            [context.userId]: user.username,
          });
          return user.username;
        }
      }
      return null;
    },
    {
      depends: [],
    }
  );

  const { data: gameSettings, loading: gameSettingsLoading } = useAsync<GameSettings>(async () => {
    return await service.getGameSettings();
  });

  const { data: postData, loading: postDataLoading } = useAsync<
    CollectionPostData | PinnedPostData | ImagePostData
  >(async () => {
    const postType = await service.getPostType(context.postId!);
    switch (postType) {
      case 'collection':
        return await service.getCollectionPost(context.postId!);
      case 'pinned':
        return await service.getPinnedPost(context.postId!);
      case 'drawing':
      default:
        return await service.getImagePost(context.postId!);
    }
  });

  
  const { data: userData, loading: userDataLoading } = useAsync<UserData>(
    async () => {
      return await service.getUser(username!, context.postId!);
    },
    {
      depends: [username],
    }
  );

  if (
    usernameLoading ||
    gameSettings === null ||
    gameSettingsLoading ||
    postData === null ||
    postDataLoading ||
 
    userData === null ||
    userDataLoading
  ) {
    return <LoadingState />;
  }

  const postType = postData.postType;
  const postTypes: Record<string, JSX.Element> = {
    drawing: (
      <ImagePost
        postData={postData as ImagePostData}
        username={username}
        gameSettings={gameSettings}
        
        userData={userData}
      />
    ),
    pinned: (
      <PinnedPost
        postData={postData}
        userData={userData}
        username={username}
        gameSettings={gameSettings}
       
      />
    ),
    // Add more post types here
  };

  /*
   * Return the custom post unit
   */

  return (
    <zstack width="100%" height="100%" alignment="top start">
      <image
        imageHeight={1024}
        imageWidth={2048}
        height="100%"
        width="100%"
        url="background.png"
        description="Striped blue background"
        resizeMode="cover"
      />
      {postTypes[postType] || (
        <vstack alignment="center middle" grow>
          <text>Error: Unknown post type</text>
        </vstack>
      )}
    </zstack>
  );
};
