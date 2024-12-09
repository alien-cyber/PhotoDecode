import type { Context } from '@devvit/public-api';
import { Devvit, useInterval, useState } from '@devvit/public-api';

import { EditorPage } from '../../components/EditorPage.js';
import { Service } from '../../service/service.js';
import Settings from '../../settings.json';

import { GameSettings } from '../../types/GameSettings.js';
import type { ImagePostData } from '../../types/PostData.js';
import type { UserData } from '../../types/UserData.js';
import { GuessScreen } from './GuessScreen.js';
import { ResultsScreen } from './ResultsScreen.js';

interface ImagePostProps {
  postData: ImagePostData;
  userData: UserData;
  username: string | null;
  gameSettings: GameSettings;

}

export const ImagePost = (props: ImagePostProps, context: Context): JSX.Element => {
  const service = new Service(context);
  const isAuthor = props.postData.authorUsername === props.username;
  const isSolved = !!props.userData.solved;
  const isSkipped = !!props.userData.skipped;

  const [currentStep, setCurrentStep] = useState<string>(
    isAuthor || isSolved || isSkipped ? 'Results' : 'Prompt'
  );

  const [pointsEarned, setPointsEarned] = useState(0);


  async function onGuessHandler(guess: string): Promise<void> {
    if (!props.postData || !props.username) {
      return;
    }
    const userGuessedCorrectly = guess.toLowerCase() === props.postData.word.toLowerCase();

   

    // Submit guess to the server
    const points = await service.submitGuess({
      postData: props.postData,
      username: props.username,
      guess,
 
    });

    // If user guessed correctly, move to results step
    if (userGuessedCorrectly) {
      setPointsEarned(points);
      setCurrentStep('Results');
    }
  }

  function onSkipHandler(): void {
    setCurrentStep('Results');
  }

  // Steps map
  const steps: Record<string, JSX.Element> = {
    Prompt: (
      <GuessScreen {...props}  onGuess={onGuessHandler} onSkip={onSkipHandler} />
    ),
    Results: (
      <ResultsScreen
        {...props}
      
        pointsEarned={pointsEarned}
        onDraw={() => setCurrentStep('Editor')}
      />
    ),
    Editor: <EditorPage {...props} onCancel={() => setCurrentStep('Results')} />,
  };

  return (
    <vstack width="100%" height="100%">
      {steps[currentStep] || <text>Error: Step not found</text>}
    </vstack>
  );
};
