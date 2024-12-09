



import { Context, Devvit,useForm, useState} from '@devvit/public-api';
import Settings from '../settings.json';
import { UserData } from '../types/UserData.js';
import { PixelSymbol } from './PixelSymbol.js';
import { PixelText } from './PixelText.js';
import { Shadow } from './Shadow.js';
import { StyledButton } from './StyledButton.js';
import { Service } from '../service/service.js';
import { GameSettings } from '../types/GameSettings.js';

import { HeroButton } from './HeroButton.js';


interface EditorPageUploadStepProps {
  username: string | null;
  userData: UserData;
  gameSettings: GameSettings;
  onNext: (img: string[], selectedCandidate: string) => void;
}

export const EditorPageUploadStep = (
  props: EditorPageUploadStepProps,
  context: Context
): JSX.Element => {
  const service = new Service(context);
  const [imageCount, setImageCount] = useState<number>(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);


    

  const uploadform = useForm(
    {
      title: 'Upload Images',
      description: "Uplaod images with relationships",
      
      acceptLabel: 'Submit',
      cancelLabel: 'cancel',
      fields: [
    
        {
          type: 'image',
          name: 'uploadimage',
          label:
            `Image Number ${imageCount+1}`,
  
        },
      ],
    },
    async (values) => {
      setImageUrls((prevUrls) => [...prevUrls, values.uploadimage]); // Add URL to the list
      setImageCount((prevCount) => prevCount + 1)
      console.log("image url",values.uploadimage);
      await context.media.upload({
        url: `${values.uploadimage}`,
        type: 'image',
      });
    }
  );

  const submitform = useForm(
    {
      title: 'Submit the word',
      description: "The word should be described by the images",
      acceptLabel: 'Submit ',
      fields: [
        {
          type: 'string',
          name: 'word',
          label: 'Word',
          required: true,
        },
       
      ],
    },
    async (values) => {
     
      const word = values.word.trim().toLowerCase();
      
      await props.onNext(imageUrls, word);
      console.log("image url from editorstep", imageUrls);;
    }
  );
  
  
  
  
 
  
  
  
  
  
  return (
    <zstack height="100%" width="100%">
      {/* Main Content */}
      <vstack height="100%" width="100%" alignment="center middle">
        {/* Blank Canvas */}
        <zstack
          height="80%"
          width="80%"
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
  
        <spacer height="6px" />
  
        {/* Upload Image Button */}
        <hstack  gap="medium" padding="medium">

        <HeroButton
          label="UPLOAD IMAGE"
          onPress={() => context.ui.showForm(uploadform)}
        />
          <HeroButton
    
          label="DONE"
          onPress={() => {
            context.ui.showForm(submitform);
          }}
        />
              </hstack>
  
        <spacer height="16px" />
      </vstack>
    </zstack>
  );
}