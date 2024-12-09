// import { updatePostPreview } from './actions/updatePostPreview.js';
/*
 * Jobs
 */



import { Devvit } from '@devvit/public-api';


/*
 * Menu Actions
 */
import { installGame } from './actions/installGame.js';



import { Router } from './posts/Router.js';


Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
});

/*
 * Custom Post
 */

Devvit.addCustomPostType({
  name: 'Photodecode',
  description: 'Upload, Guess, Laugh!',
  height: 'tall',
  render: Router,
});

/*
 * Menu Actions
 */

// Subreddit
Devvit.addMenuItem(installGame); // Mod





export default Devvit;
