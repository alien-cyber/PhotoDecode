import type {

    Post,
    RedditAPIClient,
    RedisClient,
    Scheduler,
    ZRangeOptions,
  } from '@devvit/public-api';
  
  import Settings from '../settings.json';

  import type { GameSettings } from '../types/GameSettings.js';
  import type {
    CollectionData,
    CollectionPostData,
    ImagePostData,
    PinnedPostData,
  } from '../types/PostData.js';
  import type { PostGuesses } from '../types/PostGuesses.js';
import type { ScoreBoardEntry } from '../types/ScoreBoardEntry.js';
  
  import type { UserData } from '../types/UserData.js';
  
  
  // Service that handles the backbone logic for the application
  // This service is responsible for:
  // * Storing and fetching post data for drawings
  // * Storing and fetching the score board
  // * Storing and fetching user settings
  // * Storing and fetching game settings
  // * Storing and fetching dynamic dictionaries
  
  export class Service {
    readonly redis: RedisClient;
    readonly reddit?: RedditAPIClient;
    readonly scheduler?: Scheduler;
  
    constructor(context: { redis: RedisClient; reddit?: RedditAPIClient; scheduler?: Scheduler }) {
      this.redis = context.redis;
      this.reddit = context.reddit;
      this.scheduler = context.scheduler;
    }
  
    /*
     * Submit Guess
     */
  
    async submitGuess(event: {
      postData: ImagePostData;
      username: string;
      guess: string;

    }): Promise<number> {
      if (!this.reddit || !this.scheduler) {
        console.error('Reddit API client or Scheduler not available in Service');
        return 0;
      }
  
     
  
      // Increment the counter for this guess
      const guessCount = await this.redis.zIncrBy(
        this.#postGuessesKey(event.postData.postId),
        event.guess,
        1
      );
  
      // Increment how many guesses the user has made for this post
      await this.redis.zIncrBy(
        this.#postUserGuessCounterKey(event.postData.postId),
        event.username,
        1
      );
  
      const isCorrect = event.postData.word.toLowerCase() === event.guess;
      const isFirstSolve = isCorrect && guessCount === 1;
      const userPoints = isCorrect
        ? isFirstSolve
          ? Settings.guesserRewardForSolve + Settings.guesserRewardForFirstSolve
          : Settings.guesserRewardForSolve
        : 0;
  
    
  
      if (isCorrect) {
        // Persist that the user has solved the post
        await this.redis.zAdd(this.#postSolvedKey(event.postData.postId), {
          member: event.username,
          score: Date.now(),
        });
  
        // Give points to drawer
        // TODO: Consider a cap on the number of points a drawer can earn from a single post
        await this.incrementUserScore(
          event.postData.authorUsername,
          Settings.authorRewardForCorrectGuess
        );
  
        // Give points to guesser
        await this.incrementUserScore(event.username, userPoints);
      }
  
      // Leave a comment to give props to the first solver.
      // Delayed 5 minutes to reduce spoiling risk.
      if (isFirstSolve) {
        const in5Min = new Date(Date.now() + 5 * 60 * 1000);
        await this.scheduler.runJob({
          name: 'FIRST_SOLVER_COMMENT',
          data: {
            postId: event.postData.postId,
            username: event.username,
          },
          runAt: in5Min,
        });
      }
  
      return userPoints;
    }
  
    /*
     * Post User Guess Counter
     *
     * A sorted set that tracks how many guesses each user has made.
     * Mainly used to count how many players there are.
     */
  
    readonly #postUserGuessCounterKey = (postId: string) => `user-guess-counter-pdg:${postId}`;
  
    async getPlayerCount(postId: string): Promise<number> {
      return await this.redis.zCard(this.#postUserGuessCounterKey(postId));
    }
  
 
  
   
    /*
     * Pixels management
     *
     * A sorted set for the in-game currency and scoreboard unit
     * - Member: Username
     * - Score: Number of pixels currently held
     */
  
    readonly scoresKeyTag: string = 'default-pdg';
    readonly scoresKey: string = `pixels-pdg:${this.scoresKeyTag}`;
  
    async getScores(maxLength: number = 10): Promise<ScoreBoardEntry[]> {
      const options: ZRangeOptions = { reverse: true, by: 'rank' };
      return await this.redis.zRange(this.scoresKey, 0, maxLength - 1, options);
    }
  
    async getUserScore(username: string | null): Promise<{
    
      score: number;
    }> {
      const defaultValue = {  score: 0 };
      if (!username) return defaultValue;
      try {
        const [score] = await Promise.all([
   
          // TODO: Remove .zScore when .zRank supports the WITHSCORE option
          this.redis.zScore(this.scoresKey, username),
        ]);
        return {
          
          score: score === undefined ? 0 : score,
        };
      } catch (error) {
        if (error) {
          console.error('Error fetching user score board entry', error);
        }
        return defaultValue;
      }
    }
  
      async incrementUserScore(username: string, amount: number): Promise<number> {
        if (this.scheduler === undefined) {
          console.error('Scheduler not available in Service');
          return 0;
        }
        const key = this.scoresKey;
      
        const nextScore = await this.redis.zIncrBy(key, username, amount);
      
     
  
        return nextScore;
      }
  
    /*
     * Post Guesses
     *
     * A sorted set that tracks how many times each guess has been made:
     * - Member: Guess
     * - Score: Count
     */
  
    readonly #postGuessesKey = (postId: string) => `guesses-pdg:${postId}`;
  
    async getPostGuesses(postId: string): Promise<PostGuesses> {
      const key = this.#postGuessesKey(postId);
      const data = await this.redis.zRange(key, 0, -1);
  
      const parsedData: PostGuesses = {
        guesses: {},
        wordCount: 0,
        guessCount: 0,
      };
  
      data.forEach((value) => {
        const { member: guess, score: count } = value;
        parsedData.guesses[guess] = count;
        parsedData.guessCount += count;
        parsedData.wordCount += 1;
      });
  
      return parsedData;
    }
  
    /*
     * User Drawings
     *
     * All shared drawings are stored in a sorted set for each player:
     * - Member: Post ID
     * - Score: Unix epoch time
     */
  
    readonly #userImagesKey = (username: string) => `user-Images-pdg:${username}`;
  
    async getUserImages(
      username: string,
      options?: {
        min?: number;
        max?: number;
      }
    ): Promise<string[]> {
      try {
        const key = this.#userImagesKey(username);
        const start = options?.min ?? 0;
        const stop = options?.max ?? -1;
        const data = await this.redis.zRange(key, start, stop, {
          reverse: true,
          by: 'rank',
        });
        if (!data || data === undefined) return [];
        return data.map((value) => value.member);
      } catch (error) {
        if (error) {
          console.error('Error fetching user drawings:', error);
        }
        return [];
      }
    }
  
    /*
     * Post data
     */
    readonly #postDataKey = (postId: string): string => `post-pdg:${postId}`;
  
    async getPostType(postId: string): Promise<string> {
      const key = this.#postDataKey(postId);
      const postType = await this.redis.hGet(key, 'postType');
      const defaultPostType = 'drawing';
      return postType ?? defaultPostType;
    }
  
    /*
     * Drawing Post data
     */
  
    readonly #postSolvedKey = (postId: string): string => `solved-pdg:${postId}`;
    readonly #postSkippedKey = (postId: string): string => `skipped-pdg:${postId}`;
  
    async getImagePost(postId: string): Promise<ImagePostData> {
      const postData = await this.redis.hGetAll(this.#postDataKey(postId));
      const solvedCount = await this.redis.zCard(this.#postSolvedKey(postId));
      const skippedCount = await this.redis.zCard(this.#postSkippedKey(postId));
      
      return {
        postId: postId,
        authorUsername: postData.authorUsername,
        data: JSON.parse(postData.data || "[]"),
        date: parseInt(postData.date),
        word: postData.word,
        
        solves: solvedCount,
        skips: skippedCount,
        postType: postData.postType,
      };
    }
  
    async getImagePosts(postIds: string[]): Promise<Pick<ImagePostData, 'postId' | 'data'>[]> {
      return await Promise.all(
        postIds.map(async (postId) => {
          const key = this.#postDataKey(postId);
          const stringifiedData = await this.redis.hGet(key, 'data');
          return {
            postId,
            data: stringifiedData ? JSON.parse(stringifiedData) : [],
          };
        })
      );
    }
  
    async skipPost(postId: string, username: string): Promise<void> {
      const key = this.#postSkippedKey(postId);
      await this.redis.zAdd(key, {
        member: username,
        score: Date.now(),
      });
    }
  
  
  
    async submitImages(data: {
      postId: string;
      word: string;
      
      data: string[];
      authorUsername: string;
      subreddit: string;
    }): Promise<void> {
      if (!this.scheduler || !this.reddit) {
        console.error('submitImages: Scheduler/Reddit API client not available');
        return;
      }
      const key = this.#postDataKey(data.postId);
    console.log("images",data.data);
      // Save post object
      await this.redis.hSet(key, {
        postId: data.postId,
        data: JSON.stringify(data.data),
        authorUsername: data.authorUsername,
        date: Date.now().toString(),
        word: data.word,
      
        postType: 'drawing',
      });
  
      // Save the post to the user's drawings
      await this.redis.zAdd(this.#userImagesKey(data.authorUsername), {
        member: data.postId,
        score: Date.now(),
      });
  
    
      // Schedule a job to pin the TLDR comment
      await this.scheduler.runJob({
        name: 'DRAWING_PINNED_TLDR_COMMENT',
        data: { postId: data.postId },
        runAt: new Date(Date.now()),
      });
  
      // Give points to the user for posting
      this.incrementUserScore(data.authorUsername, Settings.authorRewardForSubmit);
    }
  
    // Game settings
    getGameSettingsKey(): string {
      return 'game-settings-pdg';
    }
  
    async storeGameSettings(settings: { [field: string]: string }): Promise<void> {
      const key = this.getGameSettingsKey();
      await this.redis.hSet(key, settings);
    }
  
    async getGameSettings(): Promise<GameSettings> {
      const key = this.getGameSettingsKey();
      return (await this.redis.hGetAll(key)) as GameSettings;
    }
  
  
  
  
    async getPostDataFromSubredditPosts(posts: Post[], limit: number): Promise<CollectionData[]> {
      return await Promise.all(
        posts.map(async (post: Post) => {
          const postType = await this.getPostType(post.id);
          if (postType === 'drawing') {
            return await this.getImagePost(post.id);
          }
          return null;
        })
      ).then((results) =>
        results.filter((postData): postData is ImagePostData => postData !== null).slice(0, limit)
      );
    }
  
    async storeCollectionPostData(data: {
      postId: string;
      data: CollectionData[];
      timeframe: string;
      postType: string;
    }): Promise<void> {
      const key = this.#postDataKey(data.postId);
      await this.redis.hSet(key, {
        postId: data.postId,
        data: JSON.stringify(data.data),
        timeframe: data.timeframe,
        postType: data.postType,
      });
    }
  
    async getCollectionPost(postId: string): Promise<CollectionPostData> {
      const key = this.#postDataKey(postId);
      const post = await this.redis.hGetAll(key);
      return {
        postId: post.postId,
        postType: 'collection',
        data: JSON.parse(post.data),
        timeframe: post.timeframe,
      };
    }
  
    /*
     * Pinned Post
     */
  
    async savePinnedPost(postId: string): Promise<void> {
      const key = this.#postDataKey(postId);
      await this.redis.hSet(key, {
        postId: postId,
        postType: 'pinned',
      });
    }
  
    async getPinnedPost(postId: string): Promise<PinnedPostData> {
      const key = this.#postDataKey(postId);
      const postType = await this.redis.hGet(key, 'postType');
      return {
        postId: postId,
        postType: postType ?? 'pinned',
      };
    }
  
    /*
     * User Data and State Persistence
     */
  
    readonly #userDataKey = (username: string) => `users-pdg:${username}`;
  
    async saveUserData(
      username: string,
      data: { [field: string]: string | number | boolean }
    ): Promise<void> {
      const key = this.#userDataKey(username);
      const stringConfig = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      );
      await this.redis.hSet(key, stringConfig);
    }
  
    async getUser(username: string, postId: string): Promise<UserData> {
    
      const solved = !!(await this.redis.zScore(this.#postSolvedKey(postId), username));
      const skipped = !!(await this.redis.zScore(this.#postSkippedKey(postId), username));
      const guessCount =
        (await this.redis.zScore(this.#postUserGuessCounterKey(postId), username)) ?? 0;
  
      const user = await this.getUserScore(username);
    
      const parsedData: UserData = {
        score: user.score,

        solved,
        skipped,
        guessCount,
      };
      return parsedData;
    }
  }
  