import { Devvit } from '@devvit/public-api';


import { HeroButton } from '../../components/HeroButton.js';
import { PixelText } from '../../components/PixelText.js';
import Settings from '../../settings.json';

interface GuessScreenSkeletonProps {
  images: string[];
  playerCount?: number;

}

export const GuessScreenSkeleton = (props: GuessScreenSkeletonProps): JSX.Element => {
  const { playerCount = 0 } = props;
  const width = 295;
 let imageUrls=props.images;
  return (
    <blocks height="tall">
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

<zstack
          height="512px"
          width="512px"
          alignment="center middle"
          backgroundColor="#f0f0f0"
        >
          {imageUrls && imageUrls.length > 0 && (() => {
            const canvasSize = 512; // Canvas size
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
        </zstack>
      </zstack>
    </blocks>
  );
};
