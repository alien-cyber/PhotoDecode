import {Context, Devvit, useState } from '@devvit/public-api';

import { Service } from '../service/service.js';

// import { EditorPageUploadStep } from './EditorPageUploadStep';
import { GameSettings } from '../types/GameSettings.js';

import type { UserData } from '../types/UserData.js';
import { GuessScreenSkeleton } from '../posts/imagesPost/GuessScreenSkeleton.js';


// import { EditorPageReviewStep } from './EditorPageReviewStep.js';
import { EditorPageUploadStep } from './EditorPageUploadStep.js';

interface EditorPageProps {
  username: string | null;
  gameSettings: GameSettings;

  userData: UserData;
  onCancel: () => void;
}

export const EditorPage = (props: EditorPageProps, context: Context): JSX.Element => {
  const defaultStep = 'upload';
  const [currentStep, setCurrentStep] = useState<string>(defaultStep);
  const [candidate, setCandidate] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);

  const service = new Service(context);

   // The back-end is configured to run this app's submitPost calls as the user
   async function onPostHandler(img:string[],selectedCandidate:string): Promise<void> {
    if (!props.username) {
      context.ui.showToast('Please log in to post');
      return;
    }
    setImages(img);
          setCandidate(selectedCandidate);
    // Add a temporary lock key to prevent duplicate posting.
    // This lock will expire after 20 seconds.
    // If the lock is already set return early.
    const lockKey = `locked-pdg:${props.username}`;
    const locked = await context.redis.get(lockKey);
    if (locked === 'true') return;
    const lockoutPeriod = 20000; // 20 seconds
    await context.redis.set(lockKey, 'true', {
      nx: true,
      expiration: new Date(Date.now() + lockoutPeriod),
    });

    // The back-end is configured to run this app's submitPost calls as the user
    const post = await context.reddit.submitPost({
      title: 'What is this?',
      subredditName: props.gameSettings.subredditName,
      preview: (
        <GuessScreenSkeleton
          images={img}
       
        />
      ),
    });

    service.submitImages({
      postId: post.id,
      word: selectedCandidate,
    
      data: img,
      authorUsername: props.username,
      subreddit: props.gameSettings.subredditName,
    });
    context.ui.navigateTo(post);
  }



  const steps: Record<string, JSX.Element> = {
    upload: (
      <EditorPageUploadStep
        {...props}
        onNext={(img,selectedCandidate) => {
       
      console.log("image url from editor", img);;
         
            
          onPostHandler(img,selectedCandidate);
          props.onCancel();

         
        }}
      />
    ),
   
    // Review: (
    //   <EditorPageReviewStep
    //     {...props}
    //     candidate={candidate}
    //     images={images}
    //     onCancel={() => {
    //       props.onCancel();
    //     }}
    //   />
    // ),
  };

  return (
    <vstack width="100%" height="100%">
      {steps[currentStep] || <text>Error: Step not found</text>}
    </vstack>
  );
};
