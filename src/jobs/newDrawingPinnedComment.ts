import { Devvit } from '@devvit/public-api';

export const newDrawingPinnedComment = Devvit.addSchedulerJob<{
  postId: string;
}>({
  name: 'DRAWING_PINNED_TLDR_COMMENT',
  onRun: async (event, context) => {
    if (event.data) {
      try {
        const comment = await context.reddit.submitComment({
          id: event.data.postId,
          text: `photo-decode is a new guessing game built on [Reddit's developer platform].`,
        });
        await comment.distinguish(true);
      } catch (error) {
        console.error('Failed to submit TLDR comment:', error);
      }
    }
  },
});
