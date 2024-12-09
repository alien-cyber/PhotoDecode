import type { Context } from '@devvit/public-api';
import { Devvit, useAsync } from '@devvit/public-api';


import { HeroButton } from '../../components/HeroButton.js';
import { LoadingState } from '../../components/LoadingState.js';
import { PixelText } from '../../components/PixelText.js';
import { PointsToast } from '../../components/PointsToast.js';
import { Service } from '../../service/service.js';
import Settings from '../../settings.json';

import type { ImagePostData } from '../../types/PostData.js';
import { abbreviateNumber } from '../../utils/abbreviateNumber.js';
import { capitalizeWord } from '../../utils/capitalizeWord.js';
import { obfuscateString } from '../../utils/obfuscateString.js';

function includesCaseInsensitive(array: string[], target: string): boolean {
  return array.some((item) => item.toLowerCase() === target.toLowerCase());
}



interface ResultsScreenProps {
  postData:ImagePostData;
  username: string | null;
 
  feedback: boolean | null;
  pointsEarned?: number;
  onDraw: () => void;
}

export const ResultsScreen = (props: ResultsScreenProps, context: Context): JSX.Element => {
  const rowCount = 6;
  const rowHeight: Devvit.Blocks.SizeString = `${100 / rowCount}%`;
  const service = new Service(context);

  const { data, loading } = useAsync<{
    guesses: { [guess: string]: number };
    wordCount: number;
    guessCount: number;
    playerCount: number;
    comments: { [guess: string]: string[] };
  }>(async () => {
    const empty = { playerCount: 0, wordCount: 0, guessCount: 0, guesses: {}, comments: {} };
    if (!props.username) return empty;
    try {
      const playerCount = await service.getPlayerCount(context.postId!);
      const guesses = await service.getPostGuesses(context.postId!);
    
      return {
        playerCount,
        wordCount: guesses.wordCount,
        guessCount: guesses.guessCount,
        guesses: guesses.guesses,
        
      };
    } catch (error) {
      if (error) {
        console.error('Error loading drawing meta data', error);
      }
      return empty;
    }
  });

  if (loading || data === null) return <LoadingState />;
  let imageUrls=props.postData.data;
  // Top N guesses (or whatever is available)
  const topGuesses = Object.entries(data.guesses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, rowCount)
    .map(([word, count]) => {
      const percentage = Math.round((count / data.guessCount) * 100);
      const isCorrect = word.toLowerCase() === props.postData.word.toLowerCase();

      const isSafeToShow = isCorrect ;

      return (
        <zstack
          height={rowHeight}
          width="100%"
          alignment="top start"
          backgroundColor="rgba(255, 255, 255, 0.2)"
          onPress={async () => {
            if (!data.comments[word]) return;
            const comment = await context.reddit.getCommentById(data.comments[word][0]);
            context.ui.navigateTo(comment);
          }}
        >
          {/* Progress Bar */}
          <hstack width={`${percentage}%`} height="100%" backgroundColor="white" />
          {/* Guess */}
          <hstack height="100%" width="100%" alignment="start middle">
            <spacer width="12px" />
            <PixelText
              color={isSafeToShow ? Settings.theme.primary : Settings.theme.tertiary}
              scale={2}
            >
              {isSafeToShow ? capitalizeWord(word) : obfuscateString(word)}
            </PixelText>
          </hstack>
          {/* Metadata */}
          <hstack height="100%" width="100%" alignment="end middle">
            <PixelText scale={1.5} color={Settings.theme.secondary}>
              {count.toString()}
            </PixelText>
            <spacer width="12px" />
            <PixelText scale={2} color={Settings.theme.primary}>
              {`${percentage}%`}
            </PixelText>
            <spacer width="12px" />
          </hstack>
        </zstack>
      );
    });

  // Add placeholder rows if there are less guesses than rowCount
  const placeholderRows = Array.from({ length: rowCount - topGuesses.length }).map(
    (_value, _index) => (
      <zstack height={rowHeight} width="100%" backgroundColor="rgba(255, 255, 255, 0.2)" />
    )
  );

  return (
    <zstack height="100%" width="100%" alignment="center middle">
      <vstack height="100%" width="100%" alignment="center middle">
        <spacer height="24px" />

        {/* Header */}
        <hstack gap="medium" alignment="center middle">
        {imageUrls && imageUrls.length > 0 && (() => {
            const canvasSize = 128; // Canvas size
            let perRow =imageUrls.length; // Images per row
            if (perRow>3){
                    perRow=3;
            }
            const imageSize = (canvasSize - (perRow - 1) * 16) / perRow; // Image size considering gap
  
            // Break images into rows for <hstack>
            const rows = [];
            for (let i = 0; i < imageUrls.length; i += perRow) {
              rows.push(imageUrls.slice(i, i + perRow));
            }
  
            return rows.map((row, rowIndex) => (
              <hstack  gap="medium" padding="medium">
                {row.map((url, index) => (
                  <hstack
                    
                    width={`${imageSize}px`}
                    height={`${imageSize}px`}
                    backgroundColor="#ffffff"
                    alignment="center middle"
                  >
                    <image
                      url={url}
                      height={`${imageSize}px`}
                      width={`${imageSize}px`}
                      imageHeight={imageSize}
                      imageWidth={imageSize}
                    />
                  </hstack>
                ))}
              </hstack>
            ));
          })()}
          <vstack gap="small" alignment="start middle">
            <PixelText scale={2}>{props.postData.word}</PixelText>
            <PixelText scale={1.5} color={Settings.theme.secondary}>
              {`By u/${props.postData.authorUsername}`}
            </PixelText>
          </vstack>
        </hstack>
        <spacer height="24px" />

        {/* List */}
        <hstack width="100%" grow>
          <spacer width="24px" />
          <vstack grow gap="small">
            {topGuesses}
            {placeholderRows}
          </vstack>
          <spacer width="24px" />
        </hstack>
        <spacer height="24px" />

        {/* Metadata */}
        <hstack alignment="middle center">
          <PixelText
            scale={1.5}
            color={Settings.theme.secondary}
          >{`${abbreviateNumber(data.playerCount)} player${data.playerCount === 1 ? '' : 's'}`}</PixelText>
          <spacer width="12px" />
          <PixelText scale={1.5} color={Settings.theme.tertiary}>
            •
          </PixelText>
          <spacer width="12px" />
          <PixelText
            scale={1.5}
            color={Settings.theme.secondary}
          >{`${abbreviateNumber(data?.guessCount)} guess${data.guessCount === 1 ? '' : 'es'}`}</PixelText>
        </hstack>

        <spacer height="14px" />

        {/* Call to action */}
        <HeroButton label="Play" onPress={() => props.onDraw()} />
        <spacer height="16px" />
      </vstack>

      {/* Feedback */}
      {/* TODO: Include firstSolve bonus check */}
      {props.feedback === true && (
        <PointsToast value={props.pointsEarned ?? Settings.guesserRewardForSolve} />
      )}
    </zstack>
  );
};
